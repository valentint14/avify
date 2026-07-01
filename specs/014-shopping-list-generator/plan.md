# Implementation Plan: Generează Listă Cumpărături (Shopping List Generator)

**Branch**: `014-shopping-list-generator` | **Date**: 2026-07-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/014-shopping-list-generator/spec.md`

## Summary

Add a "Generează listă cumpărături" button to the existing "Stoc materiale" page. Clicking it opens a Dialog modal that fetches `GET /api/shopping-list` — a new route backed by `getShoppingList()` in `src/lib/shoppingList.js`. That function runs two synchronous SQLite queries: one aggregation query (orders → products → recipe_lines → materials, filtered to a 30-day date window) to compute `totalRequired` per material, and one count query for products excluded due to missing template or recipe. The modal displays rows sorted by material name, separates "to buy" from "already covered", shows a warning for excluded products, and includes a "Printează lista" button that calls `window.print()` with Tailwind `print:hidden` utilities suppressing all UI chrome from the print output.

No new DB tables or columns are required. The 30-day window is computed as today's ISO date plus 30 days; SQLite string comparison on `YYYY-MM-DD` TEXT fields works correctly without date arithmetic functions.

## Technical Context

**Language/Version**: JavaScript (ES2022) / Node.js 26 / Next.js 14 (App Router)

**Primary Dependencies**: React 18, Tailwind CSS v4, shadcn/ui (`Dialog` from `radix-ui` already installed), Lucide React (icons already installed), `node:sqlite` DatabaseSync

**Storage**: SQLite via `node:sqlite` DatabaseSync — `getDb()` singleton; two read-only queries across `orders`, `products`, `product_templates`, `recipe_lines`, `materials`; no schema changes required

**Testing**: Jest (`next/jest`) for integration tests of `getShoppingList()`; Playwright (`@playwright/test`, `workers: 1`, shared SQLite DB) for E2E tests

**Target Platform**: Web (Next.js local dev server), Windows desktop

**Project Type**: Next.js 14 App Router web application (local desktop deployment)

**Performance Goals**:
- Button click to modal display: < 3 s for typical workshop dataset (SC-001 — up to 100 orders, 50 materials)
- Two synchronous SQLite queries; no N+1 patterns

**Constraints**:
- `node:sqlite` DatabaseSync is synchronous — MUST NOT change to async
- `getDb()` singleton must be used for all DB access
- `export const dynamic = 'force-dynamic'` required on the API route
- No new npm packages — shadcn Dialog and Lucide icons are already available
- Shopping list is read-only and non-persisted — no DB writes

**Scale/Scope**: Up to 100 orders in 30-day window, up to 50 materials (SC-001)

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| Code Quality | PASS | Single-purpose `getShoppingList()` lib function; thin route handler; components follow existing patterns |
| Testing Standards | PASS | Jest integration covers SQL aggregation logic; Playwright E2E covers US1 + US2 acceptance scenarios |
| UX Consistency | PASS | Uses shadcn Dialog (already installed), Lucide icons, Tailwind tokens — no one-off components |
| Performance | PASS | Two synchronous SQLite queries on local disk; well under 3 s threshold |
| Accessibility | PASS | Dialog carries Radix ARIA roles automatically; close button has `aria-label`; print button is standard `<button>` |
| No Placeholders | PASS | All tasks reference exact file paths and function signatures |

## Project Structure

### Documentation (this feature)

```text
specs/014-shopping-list-generator/
├── plan.md              ← this file
├── research.md          ← Phase 0: date window, join strategy, UI approach, print strategy
├── data-model.md        ← ShoppingListResult + ShoppingListRow aggregates + SQL
├── quickstart.md        ← validation scenarios
├── contracts/
│   └── api-contracts.md ← GET /api/shopping-list response shape + UI contract
└── tasks.md             ← /speckit-tasks output (not yet created)
```

### Source Code (repository root)

```text
src/
├── app/
│   └── api/
│       └── shopping-list/
│           └── route.js                   ← NEW: GET /api/shopping-list handler
├── components/
│   ├── MaterialsPage.js                   ← EXTEND: add button + ShoppingListModal state
│   └── ShoppingListModal.js               ← NEW: Dialog modal with list + print
└── lib/
    └── shoppingList.js                    ← NEW: getShoppingList() aggregation function

tests/
├── integration/
│   └── shopping-list/
│       └── shoppingList.test.js           ← NEW: Jest integration tests
└── e2e/
    └── shopping-list.spec.js              ← NEW: Playwright E2E for US1–US2
```

**Structure Decision**: Next.js App Router, single project. No new page/route for the UI — the feature lives inside the existing `stoc-materiale` page via a Dialog modal. API route follows the `/api/mod-productie/` naming convention. Lib function in `src/lib/shoppingList.js` keeps aggregation logic isolated and testable. Modal extracted as `ShoppingListModal.js` to keep `MaterialsPage.js` manageable.

## Implementation Notes

### `getShoppingList()` (`src/lib/shoppingList.js`)

```js
'use strict';
const { getDb } = require('./db.js');

const SHOPPING_LIST_SQL = `
  SELECT
    m.id            AS material_id,
    m.name          AS material_name,
    m.unit,
    m.current_stock,
    SUM(rl.qty_per_piece * CAST(p.quantity AS REAL)) AS total_required
  FROM orders o
  JOIN products p      ON p.order_id    = o.id
  JOIN recipe_lines rl ON rl.template_id = p.template_id
  JOIN materials m     ON m.id           = rl.material_id
  WHERE (
    (o.event_date    >= :today AND o.event_date    <= :cutoff)
    OR
    (o.delivery_date >= :today AND o.delivery_date <= :cutoff)
  )
  AND p.status IN ('de_realizat', 'in_realizare')
  AND rl.qty_per_piece > 0
  GROUP BY m.id
  ORDER BY m.name ASC
`;

const EXCLUDED_COUNT_SQL = `
  SELECT COUNT(*) AS excluded_count
  FROM orders o
  JOIN products p ON p.order_id = o.id
  WHERE (
    (o.event_date    >= :today AND o.event_date    <= :cutoff)
    OR
    (o.delivery_date >= :today AND o.delivery_date <= :cutoff)
  )
  AND p.status IN ('de_realizat', 'in_realizare')
  AND (
    p.template_id IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM recipe_lines rl
      WHERE rl.template_id = p.template_id AND rl.qty_per_piece > 0
    )
  )
`;

function getShoppingList() {
  const db     = getDb();
  const today  = new Date().toISOString().slice(0, 10);
  const cutoff = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const rows              = db.prepare(SHOPPING_LIST_SQL).all({ today, cutoff });
  const { excluded_count } = db.prepare(EXCLUDED_COUNT_SQL).get({ today, cutoff });

  return {
    rows: rows.map((r) => ({
      materialId:    r.material_id,
      materialName:  r.material_name,
      unit:          r.unit ?? null,
      totalRequired: Number(r.total_required),
      currentStock:  Number(r.current_stock),
      toBuy:         Math.max(0, Number(r.total_required) - Number(r.current_stock)),
    })),
    excludedCount: Number(excluded_count ?? 0),
    generatedAt:   new Date().toISOString(),
  };
}

module.exports = { getShoppingList };
```

**Key design decisions**:
- Inner JOINs on `recipe_lines` and `p.template_id` auto-exclude ad-hoc products (NULL `template_id` → JOIN fails) and templates with no recipe lines — no explicit filter needed in the main query.
- `AND rl.qty_per_piece > 0` guards against data-entry errors (zero/negative recipe entries contribute nothing).
- Named parameters `:today` / `:cutoff` match `node:sqlite` named-parameter syntax; passed as `{ today, cutoff }`.
- `EXCLUDED_COUNT_SQL` uses a separate query so the main query stays clean.
- `toBuy = Math.max(0, totalRequired - currentStock)` — floored at zero per FR-007.

### `GET /api/shopping-list` (`src/app/api/shopping-list/route.js`)

```js
import { getShoppingList } from '../../../lib/shoppingList.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return Response.json(getShoppingList());
  } catch {
    return Response.json({ error: 'Eroare internă de server.' }, { status: 500 });
  }
}
```

### `ShoppingListModal.js` client component key behaviours

- Accepts `open` and `onClose` props; renders shadcn `<Dialog open={open} onOpenChange={onClose}>`
- `useEffect([open])`: when `open` flips to `true`, fetch `/api/shopping-list` and update `{ loading, error, result }` state
- Splits `result.rows` into `toBuyRows` (toBuy > 0) and `coveredRows` (toBuy === 0)
- Empty states: no qualifying orders → "Nu există comenzi cu termen în următoarele 30 de zile." (`data-testid="no-orders-message"`); all covered → "Stocul existent acoperă toată producția planificată." (`data-testid="all-covered-message"`)
- Excluded warning: `result.excludedCount > 0` → "X produs(e) fără rețetă nu au putut fi calculate."
- Print: `<button onClick={() => window.print()} className="print:hidden">Printează lista</button>`; close button also has `print:hidden`; DialogOverlay has `print:hidden` (overridden via className prop); list content prints as-is with a generation date header
- `data-testid="shopping-list-modal"` on DialogContent
- `data-testid="shopping-list-row"` on each material row in the "to buy" section

### `MaterialsPage.js` extension

Add `const [showShoppingList, setShowShoppingList] = useState(false)` and in the header `<div>`:
```jsx
<div className="flex items-start justify-between gap-4">
  <div className="flex flex-col gap-1">
    <h1 ...>Stoc Materiale</h1>
    <p ...>...</p>
  </div>
  <Button onClick={() => setShowShoppingList(true)}>
    Generează listă cumpărături
  </Button>
</div>
<ShoppingListModal open={showShoppingList} onClose={() => setShowShoppingList(false)} />
```
