# Research: Generează Listă Cumpărături (Shopping List Generator)

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

**Purpose**: Document design decisions made during planning so implementation tasks have clear, justified rationale.

---

## Decision 1: 30-day date window SQL

**Decision**: Filter orders using ISO date string comparison:
```sql
WHERE (
  (o.event_date    >= :today AND o.event_date    <= :cutoff)
  OR
  (o.delivery_date >= :today AND o.delivery_date <= :cutoff)
)
```
where `:today = YYYY-MM-DD` (today) and `:cutoff = YYYY-MM-DD` (today + 30 days).

**Rationale**: SQLite stores dates as TEXT in `YYYY-MM-DD` or ISO-8601 format. Lexicographic string comparison on this format is equivalent to chronological comparison — no special date functions needed. The OR condition satisfies FR-002 (either date places an order in scope) and FR-003 (orders with neither date cannot satisfy either condition, so they are excluded automatically — no extra NULL filter required).

**Alternatives considered**:
- `JULIANDAY()` arithmetic — produces the same result but adds unnecessary complexity; rejected.
- Storing dates as UNIX timestamps — not how the schema was designed; rejected.

**Implementation detail**: In `getShoppingList()`, compute:
```js
const today  = new Date().toISOString().slice(0, 10);   // e.g. '2026-07-01'
const cutoff = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
```
Both today and day+30 are inclusive per spec assumption ("day+30 inclusive").

---

## Decision 2: SQL join strategy (inner join auto-excludes)

**Decision**: Use inner JOINs on `recipe_lines` and `p.template_id` for the main aggregation query. This automatically excludes:
- Ad-hoc products (`p.template_id IS NULL` → `JOIN recipe_lines ON rl.template_id = p.template_id` fails with NULL → row dropped)
- Templates with no recipe lines (no matching `recipe_lines` rows → inner JOIN produces no rows for that product)

A separate `EXCLUDED_COUNT_SQL` query counts products that fall into these excluded categories using `p.template_id IS NULL OR NOT EXISTS (SELECT 1 FROM recipe_lines ...)`.

**Rationale**: Keeps the main query clean and correct. The inner join exclusion is a natural consequence of the relational model — no ad-hoc `CASE`/`FILTER` logic needed. The separate count query is simple and doesn't complicate the aggregation.

**Alternatives considered**:
- LEFT JOIN + `WHERE rl.id IS NULL` to find excluded products in one query — would require a UNION or conditional aggregation; more complex with no benefit.
- Counting excluded products in application code — would require fetching all products first; rejected (two simple SQL queries beat one complex query + JS filtering).

---

## Decision 3: UI placement — Dialog modal (not a new page)

**Decision**: The shopping list is displayed in a shadcn `Dialog` modal triggered from a button on the "Stoc materiale" page. No new route is added.

**Rationale**: The feature is a contextual read-only report accessed from the materials page. A modal keeps the user in context, avoids a route change, and matches how other temporary views (e.g., AlertDialog for delete confirmation) are handled in this codebase. The `Dialog` component is already installed via shadcn/ui.

**Alternatives considered**:
- Dedicated `/lista-cumparaturi` page — heavier navigation, breaks the contextual relationship with the stock page; rejected.
- Side sheet/drawer — also available via Radix, but a Dialog is simpler and already used in `MaterialsPage.js` (AlertDialog); rejected in favour of Dialog.
- Inline expand section on the same page — poor UX; the list can be long and would push page content down; rejected.

---

## Decision 4: Separate `ShoppingListModal.js` component

**Decision**: Extract the modal into its own client component `src/components/ShoppingListModal.js` rather than inlining it in `MaterialsPage.js`.

**Rationale**: `MaterialsPage.js` already has significant state and handlers (add/edit/delete/error). Adding the full modal markup, fetch logic, and list rendering inline would push the file past a readable size. A separate component with `open` / `onClose` props is clean and testable.

**Alternatives considered**:
- Inline in `MaterialsPage.js` — simple but makes the file unwieldy; rejected.
- Custom hook for data fetching + inline render — adds indirection without benefit at this complexity level; rejected.

---

## Decision 5: Fetch on modal open (no pre-fetch)

**Decision**: `ShoppingListModal.js` fetches `/api/shopping-list` inside a `useEffect` when `open` becomes `true`. Each open triggers a fresh fetch.

**Rationale**: FR-015 explicitly requires no caching — "the list MUST be recalculated on each button click." A `useEffect([open])` that runs when `open` flips to `true` is the simplest implementation of this requirement. The fetch is fast (two synchronous SQLite queries) so no pre-fetching optimisation is needed.

**Alternatives considered**:
- Fetch on page load (before button click) — violates FR-015 and wastes resources for users who never open the modal; rejected.
- SWR/React Query with `revalidateOnMount` — adds a dependency not used elsewhere in the project; rejected.

---

## Decision 6: Print strategy — `window.print()` + Tailwind `print:hidden`

**Decision**: The "Printează lista" button calls `window.print()`. Tailwind's `print:hidden` utility class is applied to:
- The close (`×`) button inside the Dialog
- The "Printează lista" button itself
- The DialogOverlay (dark backdrop) — via `className` prop or by wrapping in a `<div className="print:hidden">`

The list content, generation date header, and material rows have no `print:hidden`, so they print normally. Since the Dialog renders in a portal (appended to `<body>`), it is present in the DOM at print time.

**Rationale**: Simplest possible approach — no new dependencies, no new windows, no PDF generation. The `print:*` Tailwind variants are already available in this project. The Dialog portal pattern means content is in the DOM when `window.print()` is called.

**Alternatives considered**:
- Open a new `window.open()` popup with only the print content — works but adds complexity (need to write HTML into the new window); rejected.
- PDF export — FR spec explicitly defers CSV/PDF to v2; rejected for v1.
- `react-to-print` library — adds a dependency; overkill for this use case; rejected.

**Implementation note**: The DialogOverlay is rendered as a separate Radix portal child. To hide it during print, wrap it or add `print:hidden` via className. Alternatively, use a global CSS rule `@media print { [data-radix-dialog-overlay] { display: none !important; } }` in `globals.css` if the className approach doesn't propagate through the Radix component. Prefer the className approach first.

---

## Decision 7: Named parameters in `node:sqlite`

**Decision**: Use `:today` and `:cutoff` as named placeholders in SQL and pass `{ today, cutoff }` as the argument object to `.all()` / `.get()`.

**Rationale**: `node:sqlite` DatabaseSync supports named parameters in the format `:name`, `@name`, or `$name`. Passing an object `{ today, cutoff }` (keys without prefix) is equivalent — the driver strips the prefix when matching. Named parameters are safer than positional `?` for multi-parameter queries: they're self-documenting and immune to argument-order bugs.

**Verification**: Confirmed by reviewing the Node.js `node:sqlite` documentation and the existing usage pattern in the project (positional `?` used in simpler queries in `materials.js`, `orders.js`, etc.).
