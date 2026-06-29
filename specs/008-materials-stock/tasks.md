---
description: "Task list for feature: Materials Stock & Recipe-Based Consumption"
---

# Tasks: Materials Stock & Recipe-Based Consumption

**Input**: Design documents from `specs/008-materials-stock/`

**Prerequisites**: [plan.md](plan.md) · [spec.md](spec.md) · [research.md](research.md) · [data-model.md](data-model.md) · [contracts/api.md](contracts/api.md)

**Organization**: Tasks grouped by user story to enable independent delivery of each increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other [P]-marked tasks in the same phase (different files, no incomplete dependencies)
- **[Story]**: Traceability label mapping to user stories in spec.md
- Each task description includes the exact file path to change

---

## Phase 1: Setup

**Purpose**: Confirm working environment — no new dependencies or directories needed for this feature.

- [X] T001 Confirm Node.js ≥ 22 is available (`node --version`) and `npm run dev` starts cleanly before making any changes

---

## Phase 2: Foundational (Schema)

**Purpose**: Extend the SQLite schema with the two new tables and the orders marker column. Every user story depends on this.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 Extend `src/lib/db.js` — inside `openDb`, add (a) `CREATE TABLE IF NOT EXISTS materials (id TEXT PRIMARY KEY, name TEXT NOT NULL, current_stock REAL NOT NULL DEFAULT 0, min_stock REAL NOT NULL DEFAULT 0, unit TEXT, created_at TEXT NOT NULL)` plus `CREATE INDEX IF NOT EXISTS idx_materials_name ON materials (name)`; (b) `CREATE TABLE IF NOT EXISTS recipe_lines (id TEXT PRIMARY KEY, template_id TEXT NOT NULL REFERENCES product_templates(id) ON DELETE CASCADE, material_id TEXT NOT NULL REFERENCES materials(id) ON DELETE CASCADE, qty_per_piece REAL NOT NULL, created_at TEXT NOT NULL)` plus `CREATE UNIQUE INDEX IF NOT EXISTS idx_recipe_lines_unique ON recipe_lines (template_id, material_id)` and `CREATE INDEX IF NOT EXISTS idx_recipe_lines_template ON recipe_lines (template_id)`; (c) an `ALTER TABLE` guard adding `stock_deducted INTEGER NOT NULL DEFAULT 0` to `orders` following the existing `orderMigrations` pattern. Ensure `PRAGMA foreign_keys = ON` is set (add once after opening the DB if not already present) so `ON DELETE CASCADE` is enforced.

**Checkpoint**: Server starts; `materials` and `recipe_lines` tables exist; `orders.stock_deducted` defaults to 0.

---

## Phase 3: User Story 1 — Manage Raw Materials Inventory (Priority: P1) 🎯 MVP

**Goal**: A "Stoc Materiale" page where users add, edit, and delete materials (name, current stock, min stock, unit); values persist across reloads; the page is reachable from the navbar.

**Independent Test**: Navigate to "Stoc Materiale", add a material with all fields, reload — it persists. Edit its stock and delete another; both changes persist.

- [X] T003 [P] [US1] Create `src/lib/materials.js` — `parseRow` mapping `{ id, name, currentStock, minStock, unit, createdAt }` (numbers via `Number`); functions `listAll()` (ORDER BY name ASC), `getById(id)`, `create({ name, currentStock, minStock, unit })` (trim name, throw if empty; coerce stocks to numbers, default 0), `update(id, fields)` (partial update of name/current_stock/min_stock/unit, return null if not found), `deleteById(id)`; plus pure helpers `isLowStock(material)` = `currentStock < minStock` and `lowStockMaterials(list)`; `module.exports` all of them. **Deviation**: `isLowStock`/`lowStockMaterials` were extracted into a new pure, DB-free module `src/lib/lowStock.js` (re-exported by `materials.js`) so the client `MaterialsPage` can import them without bundling `node:sqlite`.
- [X] T004 [P] [US1] Add "Stoc Materiale" link to `src/lib/navigation.js` — append `{ label: 'Stoc Materiale', href: '/stoc-materiale' }` to `NAV_LINKS`
- [X] T005 [US1] Create `src/app/api/materials/route.js` — `GET` returns `{ materials: listAll() }`; `POST` validates name non-empty (400 `"Numele materialului este obligatoriu."`) and currentStock/minStock finite ≥ 0 (400 `"Stocul trebuie să fie un număr pozitiv."`), creates and returns `{ material }` with status 201 (depends on T003)
- [X] T006 [US1] Create `src/app/api/materials/[id]/route.js` — `PATCH` accepts any subset of `{ name, currentStock, minStock, unit }`, 400 if none provided, same field validation as POST, 404 `"Materialul nu a fost găsit."` if unknown, returns `{ material }`; `DELETE` returns `{ deleted: true }` or 404 (depends on T003)
- [X] T007 [P] [US1] Create `src/styles/materials.css` — styles for the page wrapper, add/edit form, material list rows, and the low-stock alert banner (reuse existing CSS variables `--color-*`, `--space-*`, `--radius-*`; alert uses a warning/danger treatment)
- [X] T008 [US1] Create `src/components/MaterialForm.js` — controlled add/edit form with inputs for name (text), currentStock (number, min 0, step 0.01), minStock (number, min 0, step 0.01), unit (text); props `{ initialValues, onSave, onCancel, submitLabel }`; client-side guard for empty name
- [X] T009 [US1] Create `src/components/MaterialsPage.js` — client component holding the materials list in state; renders the title, an add form (MaterialForm), and the list with per-row edit/delete (inline edit via MaterialForm, delete with confirm); wires `POST/PATCH/DELETE /api/materials`; import `../styles/materials.css` (low-stock alert added in US3/T013 — leave a placeholder area or add it now if trivial)
- [X] T010 [US1] Create `src/app/stoc-materiale/page.js` — server component that imports `listAll` from `../../lib/materials.js`, fetches initial materials, and renders `<MaterialsPage initialMaterials={...} />`

**Checkpoint**: US1 independently testable — full material CRUD persists; navbar link works.

---

## Phase 4: User Story 2 — Define Product Recipes (Priority: P2)

**Goal**: In the Product Catalog, each catalog product can have a recipe (material + per-piece consumption); recipes persist and enforce positive quantities and no duplicate materials.

**Independent Test**: Open a catalog product, add two recipe lines for two materials with per-piece quantities, save, reopen — both lines reappear exactly.

- [X] T011 [P] [US2] Create `src/lib/recipes.js` — `parseRow` mapping `{ id, templateId, materialId, qtyPerPiece, createdAt }`; `getRecipeForTemplate(templateId)` returning enriched lines (LEFT JOIN materials to add `materialName`, `unit`); `replaceRecipe(templateId, lines)` that, in a transaction, deletes existing lines for the template and inserts the validated set (validate each `qtyPerPiece` finite > 0, each `materialId` exists, no duplicate materialId — throw typed errors the route maps to 400); `getRecipesByTemplateIds(ids)` returning a `{ [templateId]: lines[] }` map for the deduction step; `module.exports` all
- [X] T012 [US2] Create `src/app/api/catalog/[id]/recipe/route.js` — `GET` returns `{ recipe: getRecipeForTemplate(id) }` (404 `"Produsul nu a fost găsit."` if template unknown); `PUT` validates the catalog product exists, validates `lines` per FR-008/FR-009 (400 `"Consumul per bucată trebuie să fie un număr pozitiv."`, 400 `"Material inexistent."`, 400 `"Un material nu poate apărea de două ori în rețetă."`), calls `replaceRecipe`, returns `{ recipe }` (empty `lines` array clears the recipe) (depends on T011)
- [X] T013 [P] [US2] Create `src/styles/recipe.css` — styles for the recipe editor: line rows (material select + qty input + remove button), an "add line" control, and save/cancel actions, consistent with `catalog.css`
- [X] T014 [US2] Create `src/components/RecipeEditor.js` — client component for a given `templateId`: on open, fetch `GET /api/catalog/[id]/recipe` and `GET /api/materials` (for the material dropdown); render editable lines (material `<select>` excluding already-selected materials to prevent duplicates, qty number input min 0.01 step 0.01); add/remove lines; Save calls `PUT /api/catalog/[id]/recipe` with the current lines; show validation errors; import `../styles/recipe.css`
- [X] T015 [US2] Modify `src/components/CatalogPage.js` — add a "Rețetă" button on each catalog item that toggles an inline `<RecipeEditor templateId={t.id} />` (mutually exclusive with the existing edit mode); no change to existing add/edit/delete flows

**Checkpoint**: US2 independently testable — recipes persist with validation; duplicates blocked; reopening shows saved lines.

---

## Phase 5: User Story 3 — Low-Stock Alert (Priority: P2)

**Goal**: The "Stoc Materiale" page shows a persistent alert naming every material whose current stock is strictly below its minimum.

**Independent Test**: Set a material below its minimum → alert names it. Equal to minimum → not listed. All at/above minimum → no alert.

- [X] T016 [US3] Extend `src/components/MaterialsPage.js` — derive `const lowStock = lowStockMaterials(materials)` (imported from the pure `../lib/lowStock.js`, not `materials.js`, to keep the client bundle free of `node:sqlite`) via `useMemo`; when non-empty, render a persistent alert banner (`role="status"`) at the top of the page listing each low material by name (and current/min values); hide the banner when empty. The banner updates automatically as materials are edited because it derives from the same state. (depends on T009; `isLowStock`/`lowStockMaterials` already created in T003)

**Checkpoint**: US3 independently testable — alert reflects strict-below-minimum set and updates on edits.

---

## Phase 6: User Story 4 — Automatic Consumption on Order Completion (Priority: P3)

**Goal**: When an order reaches the finalized state (all products `gata`), material stock is reduced by Σ(product quantity × per-piece consumption), exactly once, never reversed.

**Independent Test**: Material stock 100, recipe 1/piece, order of 30 → completing brings stock to 70; re-completing does not deduct again; products with no recipe still complete; deletion does not restore.

- [X] T017 [US4] Create `src/lib/stock.js` — pure `computeConsumption(products, recipesByTemplateId)` returning `{ [materialId]: totalQty }` summing `product.quantity × line.qtyPerPiece` over each product's recipe lines (skip products with null `templateId` or no recipe); and `deductStockForOrder(orderId)` that: loads the order (return `{ deducted: false }` if missing or `stock_deducted = 1`), loads its products, returns `{ deducted: false }` if zero products or any product not `gata`, builds the recipe map via `getRecipesByTemplateIds`, computes consumption, then in a single transaction `UPDATE materials SET current_stock = current_stock - ?` per material (allowed below 0/min per FR-017) and `UPDATE orders SET stock_deducted = 1`, returning `{ deducted: true, changes }`; `module.exports = { computeConsumption, deductStockForOrder }`
- [X] T018 [US4] Modify `src/app/api/products/[id]/route.js` — in the `PATCH` handler, after a successful status change (the `hasStatus` branch), import and call `deductStockForOrder(product.orderId)` (use the updated product's `orderId`); wrap the call so a deduction error does not break the status-update response; the response shape stays `{ product }` (depends on T017)

**Checkpoint**: US4 independently testable — completion deducts once, is idempotent, tolerates missing recipes, and is never reversed.

---

## Phase 7: Polish & Tests (Constitution-Required)

**Purpose**: Automated coverage required by constitution (80% floor for `src/lib/`, acceptance scenario gate for every user story).

- [X] T019 [P] Write unit tests in `tests/unit/lib/materials.test.js` — CRUD (create/get/list/update/delete), name-required validation, stock coercion; `isLowStock` strict-below boundary (below, equal, above); `lowStockMaterials` filtering
- [X] T020 [P] Write unit tests in `tests/unit/lib/recipes.test.js` — `replaceRecipe` happy path, rejects qtyPerPiece ≤ 0, rejects unknown material, rejects duplicate material; `getRecipeForTemplate` enrichment; empty-lines clears recipe; cascade removal when a material is deleted
- [X] T021 [P] Write unit tests in `tests/unit/lib/stock.test.js` — `computeConsumption`: single product (30×1), decimal (10×0.2=2), two products sharing a material summed, product without recipe contributes 0; `deductStockForOrder`: deducts when all `gata`, no-op when not complete, no-op when already deducted (idempotency), no-op for unknown order, allows stock below zero
- [X] T022 [P] Write integration tests in `tests/integration/api/materials.test.js` — POST/GET/PATCH/DELETE material happy paths + validation errors (empty name, negative stock, 404)
- [X] T023 [P] Write integration tests in `tests/integration/api/recipe.test.js` — GET empty recipe, PUT valid recipe, PUT rejects duplicate/negative/unknown material, GET after PUT returns enriched lines, 404 for unknown template
- [X] T024 [P] Write E2E tests in `tests/e2e/materials-stock.spec.js` — cover quickstart scenarios: US1 (material CRUD persists, navbar link), US2 (define + reopen recipe, duplicate blocked, invalid qty rejected), US3 (low-stock alert strict-below, updates on edit), US4 (complete order deducts correct totals, idempotent re-complete, no-recipe completes, delete does not restore); run with `workers: 1` per project config
- [X] T025 Run full test suite and confirm gates: `npm test -- --coverage` (unit + integration) and `npm run test:e2e -- --grep "materials-stock"` (E2E); verify `src/lib/` line coverage ≥ 80% including `materials.js`, `recipes.js`, `stock.js`

> **T025 results**: 185/185 unit + integration tests pass (was 138 before this feature; +47 new). `src/lib/` line coverage = 94.79% (gate: 80%) — new modules: `lowStock.js` 100%, `materials.js` 90.9%, `recipes.js` 94.73%, `stock.js` 93.75%. All 5 feature-008 E2E scenarios pass (US1 CRUD + persistence, US1 navbar, US2 recipe define/persist, US3 low-stock alert strict-below, US4 deduct-once + idempotent + no-restore-on-delete). One E2E selector fix was needed (edit form is scoped to `.materials-list` since edit mode replaces the row's name span).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **BLOCKS** all user story phases
- **US1 (Phase 3)**: Depends on Phase 2 (T002)
- **US2 (Phase 4)**: Depends on Phase 2; recipe material dropdown benefits from US1 materials existing but is code-independent of US1
- **US3 (Phase 5)**: Depends on US1 (T009 page + T003 helpers)
- **US4 (Phase 6)**: Depends on US1 (materials data layer) + US2 (recipes data layer)
- **Polish (Phase 7)**: Depends on all story phases complete

### User Story Dependencies

| Story | Depends On | Notes |
|-------|------------|-------|
| US1 (Phase 3) | Phase 2 | Foundational MVP — fully standalone |
| US2 (Phase 4) | Phase 2 | Recipe layer; needs materials to select at runtime (US1 data) |
| US3 (Phase 5) | US1 | Alert derives from the materials list/helpers |
| US4 (Phase 6) | US1 + US2 | Deduction needs materials + recipes |

### Within Each User Story

- Data-layer (`src/lib/*`) before API routes before UI components
- `MaterialsPage.js` changes are sequential (T009 → T016, same file)
- CSS tasks [P] run alongside their component/route tasks

### Parallel Opportunities

Within Phase 3 (US1):
```
T003 (materials.js)  ←─ parallel ─→  T004 (navigation.js)  ←─ parallel ─→  T007 (materials.css)
T005, T006 (API)     — after T003
T008 (MaterialForm)  ←─ parallel ─→  T009 (MaterialsPage, after T005/T006/T008) ... T010 page after T009
```

Within Phase 4 (US2):
```
T011 (recipes.js)  ←─ parallel ─→  T013 (recipe.css)
T012 (API)         — after T011
T014, T015 (UI)    — after T012, T013
```

Within Phase 7:
```
T019, T020, T021, T022, T023, T024  — all [P] (different test files)
T025 — after all tests written
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup (T001)
2. Phase 2: Foundational schema (T002) — CRITICAL gate
3. Phase 3: US1 (T003–T010) — materials page with full CRUD
4. **STOP and VALIDATE**: add/edit/delete materials, persistence, navbar link
5. Optionally demo — the inventory register alone is useful

### Incremental Delivery

1. Foundation (T001–T002) → schema ready
2. US1 (T003–T010) → materials management ✓ (MVP)
3. US2 (T011–T015) → recipes on catalog products ✓
4. US3 (T016) → low-stock alert ✓
5. US4 (T017–T018) → automatic consumption ✓
6. Polish (T019–T025) → all tests green ✓

Each phase adds independent, demonstrable value without breaking prior phases.

---

## Notes

- No new npm dependencies — Node built-in `node:sqlite` and React hooks only
- Schema changes use the existing idempotent `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE` guard pattern in `db.js`; safe to re-run on every server start
- `PRAGMA foreign_keys = ON` is required for `ON DELETE CASCADE` (material delete → recipe cleanup); verify it is enabled in `openDb`
- The deduction trigger lives in the product status PATCH route and is idempotent — it is safe to call on every status change; the all-`gata` check + `stock_deducted` marker gate the actual work (FR-013/FR-015)
- Stock may go below zero/minimum by design (FR-017); the low-stock alert (US3) surfaces the result
- Deleting an order does NOT restore stock (FR-018) — no change to the order delete route is needed
- Constitution reminder: no mock DB in integration tests; use the real SQLite test setup per existing `tests/` config
