# Phase 0 Research: Mod producție

## Decision 1: Status scope — what "De realizat" means technically

**Decision**: Filter on `products.status = 'de_realizat'`, not on an orders-level status field.

**Rationale**: The `orders` table has no persisted `status` column. Orders derive their status at query time via `DERIVED_STATUS_SQL` in `src/lib/orders.js`: `'finalizata'` when all products are `'realizat'`, `'in_progres'` otherwise. Neither value matches the user's "De realizat" label. The individual product status column (`products.status`) has exactly three values: `'de_realizat'`, `'in_realizare'`, `'realizat'` — matching the Kanban board columns. The spec's phrase "produse din comenzi aflate în starea 'De realizat'" is most coherently interpreted as "products in the 'de_realizat' Kanban column", i.e., work items not yet started.

**Alternatives considered**:
- Filter on `orders.status = 'in_progres'` and include all products from those orders — rejected because this would include products already `'in_realizare'` or `'realizat'`, mixing items already in progress or done into a "to-do" production list.
- Add a separate status column to the `orders` table — rejected: unnecessary schema change; the derived status is sufficient for all current use cases.

---

## Decision 2: Grouping key for the production queue

**Decision**: Group by `COALESCE(pt.id, p.name)`. When `template_id` is not null, `product_templates.name` is the display label. When `template_id` is null (ad-hoc product), `products.name` is both the grouping key and the display label.

**Rationale**: Products can be created from a catalog template (they carry `template_id`) or created manually with a free-text name (they carry `template_id = NULL`). The spec says "grupate după șablonul de produs sau materialul folosit". "Șablonul de produs" → template. "Materialul folosit" → for manual products, the product name is the closest available descriptor for what is being made. The `recipe_lines` table links templates to materials (e.g., "Banner PVC" → [PVC vinyl, metal grommets]), but since one template can use multiple materials, grouping by material would explode one product into multiple rows — wrong for a "total quantity to produce" view.

**Alternatives considered**:
- Group by `recipe_lines.material_id` for template-based products — rejected: multi-material templates would appear in multiple groups, breaking the quantity sum semantics.
- Group by product `name` for all products (ignore template entirely) — rejected: two orders with the same template but different product names (e.g., one renamed manually) would be split. Template-based grouping is more stable.
- Introduce a "Fără categorie" group for NULL template_id — partially adopted: the display falls back to product name, which is already descriptive enough (e.g., "Plic personalizat"). A "Fără categorie" bucket would hide useful information.

---

## Decision 3: Refresh mechanism

**Decision**: Manual client-side refresh via `fetch('/api/mod-productie')` in a `'use client'` component. No timer-based polling. A `fetchedAt` ISO timestamp is returned with every response and displayed to the user.

**Rationale**: The spec (US3, FR-009, FR-010) requires a manual refresh action with a "last updated" timestamp. Auto-refresh on a timer was explicitly ruled out in spec Assumptions. The existing pattern (e.g., `MaterialsPage.js`) already handles client-side refresh by calling the API on demand. A dedicated `GET /api/mod-productie` route keeps the server-side initial load (Server Component) and the client-side refresh (fetch) using the same data source.

**Alternatives considered**:
- Server Action (`revalidatePath`) — rejected: Next.js 14 route-level revalidation triggers a full route re-render, not a partial data update; introduces more complexity for a simple read operation.
- `router.refresh()` — rejected: refreshes the entire page tree; the user would see the skeleton flash on every refresh, which is undesirable UX.
- Polling every 30 s — rejected: explicitly excluded in spec Assumptions.

---

## Decision 4: Collapsible group UI implementation

**Decision**: Use the shadcn/ui `Collapsible` component (wraps `@radix-ui/react-collapsible`) for expand/collapse behaviour on each group row.

**Rationale**: shadcn/ui is already the project's design system (confirmed in `plan.md` for feature 012 and in `src/components/`). The Collapsible primitive provides correct `aria-expanded` semantics, keyboard navigation (Enter/Space), and animation without adding new packages. Radix UI is already a transitive dependency.

**Alternatives considered**:
- Native `<details>/<summary>` HTML — rejected: no programmatic control of open state (needed for "collapse all" or controlled state management); inconsistent styling across browsers.
- Custom `useState` + CSS height animation — rejected: more code for the same result as a well-tested primitive.

---

## Decision 5: Contributing orders aggregation strategy

**Decision**: Use SQLite `json_group_array(json_object(...))` to aggregate contributing orders inline in the same query, then parse the JSON string in JavaScript.

**Rationale**: A single SQL pass retrieves both the group totals and the per-order breakdown. This avoids N+1 queries (one per group). SQLite's `json_group_array` is available since SQLite 3.38 (2022); Node.js 26 ships SQLite 3.46+. The JSON string is parsed with `JSON.parse()` on the JavaScript side — a reliable, zero-dependency approach.

**Alternatives considered**:
- Two separate queries (one for groups, one for contributing orders per group) — rejected: N+1 pattern, potentially 50+ queries for a large production queue.
- `GROUP_CONCAT` with a delimiter — rejected: brittle for names containing commas; JSON is unambiguous.
