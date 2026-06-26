# Tasks: Catalog Produse

**Input**: Design documents from `specs/003-product-catalog/`

**Prerequisites**: [plan.md](plan.md) · [spec.md](spec.md) · [research.md](research.md) · [data-model.md](data-model.md) · [contracts/api.md](contracts/api.md) · [quickstart.md](quickstart.md)

**Tests**: Included per constitution (NON-NEGOTIABLE). TDD preferred — write unit/integration tests before implementation where marked.

**Organization**: Grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (US1–US4)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create new directory structure required by the feature.

- [X] T001 Create `src/app/catalog/` and `src/app/api/catalog/[id]/` directories (Next.js route files go here in Phase 3–4)
- [X] T002 Create `tests/unit/lib/` and `tests/integration/` directories if not already present; confirm Playwright config covers `tests/e2e/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: DB schema extension and core library — MUST be complete before any user story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Extend `src/lib/db.js`: add `CREATE TABLE IF NOT EXISTS product_templates` DDL (id, name, description, created_at, index on name); add conditional migration block using `PRAGMA table_info(products)` to run `ALTER TABLE products ADD COLUMN template_id TEXT REFERENCES product_templates(id) ON DELETE SET NULL` only when column is absent — see [data-model.md](data-model.md) for exact SQL
- [X] T004 [P] Write Jest unit tests (failing) for `src/lib/productTemplates.js` in `tests/unit/lib/productTemplates.test.js`: cover `listAll()`, `search(q)`, `create(name, description)`, `update(id, fields)`, `deleteById(id)`, empty-name rejection, delete of unknown id returns false — tests must fail before T005
- [X] T005 [P] Write Jest unit tests (failing) for updated `src/lib/products.js` in `tests/unit/lib/products.test.js`: cover `createProduct(orderId, name, templateId?)` with and without templateId, verify `templateId` is stored on the returned object — tests must fail before T006
- [X] T006 Implement `src/lib/productTemplates.js`: export `listAll()`, `search(q)` (SQL LIKE `%q%` on name), `getById(id)`, `create(name, description)`, `update(id, { name, description })`, `deleteById(id)` — uses `getDb()` from `src/lib/db.js`; validates name non-empty; satisfies T004 tests
- [X] T007 Modify `src/lib/products.js`: extend `createProduct(orderId, name, templateId = null)` to accept and persist optional `templateId`; add `createProductFromTemplate(orderId, templateId)` that looks up the template by id and delegates to `createProduct`; update `parseRow` to include `templateId: row.template_id`; satisfies T005 tests

**Checkpoint**: `npm test tests/unit/lib/` must pass before proceeding to Phase 3.

---

## Phase 3: User Story 1 — Gestionare Catalog Produse (Priority: P1) 🎯 MVP

**Goal**: Deliver a fully functional `/catalog` page where product templates can be created, edited, and deleted.

**Independent Test**: Navigate to `http://localhost:3000/catalog` — add "Invitație clasică", edit it, delete it, reload and verify persistence. See [quickstart.md Scenario 1](quickstart.md).

### Tests

- [X] T008 [P] Write Jest API integration tests for `GET /api/catalog` and `POST /api/catalog` in `tests/integration/api.catalog.test.js` using `openDb(':memory:')`: verify list returns empty array initially; POST creates and returns template; POST with empty name returns 400 — tests must fail before T009–T010

### Implementation

- [X] T009 [P] Create `src/app/api/catalog/route.js`: `GET` handler — reads optional `?q=` param, calls `productTemplates.search(q)` or `listAll()`, returns `{ templates: [...] }` 200; `POST` handler — validates `name`, calls `productTemplates.create(name, description)`, returns `{ template }` 201 / 400 on empty name / 500 on error — all error messages in Romanian
- [X] T010 [P] Create `src/app/api/catalog/[id]/route.js`: `PATCH` handler — validates at least one field present and name non-empty if provided, calls `productTemplates.update(id, fields)`, returns `{ template }` 200 / 400 / 404; `DELETE` handler — calls `productTemplates.deleteById(id)`, returns 204 / 404
- [X] T011 Create `src/styles/catalog.css`: styles for `.catalog-page`, `.catalog-list`, `.catalog-item`, `.catalog-item--editing`, `.catalog-add-form`, inline edit row, delete confirm inline prompt (no `window.confirm()` — use inline confirmation UI per note below), chip placeholder for empty state — Romanian text baked into class usage
- [X] T012 [P] Create `src/components/CatalogProductForm.js` (`'use client'`): controlled form with `name` (required) and `description` (optional) text inputs; `onSave(data)` and `onCancel()` props; inline validation — shows Romanian error if name empty; used for both add and edit modes
- [X] T013 Create `src/components/CatalogPage.js` (`'use client'`): receives `initialTemplates` prop; local state for template list, edit target, delete confirm target; renders: header, `CatalogProductForm` for adding (always visible at top), list of templates each with name, description, Edit button (swaps row to `CatalogProductForm`), Delete button (shows inline "Ești sigur?" + Confirm/Cancel — **no `window.confirm()`**); on add/edit/delete fetches the relevant `/api/catalog` endpoint and updates local state; shows "Catalogul este gol" message with instruction when list is empty
- [X] T014 Create `src/app/catalog/page.js` (server component): fetches initial templates via `productTemplates.listAll()` directly (server-side call, no fetch); renders `<CatalogPage initialTemplates={templates} />`; sets page title
- [X] T015 [P] [US1] Playwright E2E — Scenario 1 (full CRUD) in `tests/e2e/catalog-crud.spec.js`: add "Invitație clasică" → verify in list; edit to "Invitație modernă" → verify; delete → verify gone; reload → verify persistent; attempt add with empty name → verify error shown
- [X] T016 [P] [US1] Playwright E2E — Scenario 3 (empty catalog warning) in `tests/e2e/catalog-crud.spec.js`: navigate to `/catalog` with empty DB; verify empty-state message displayed

**Checkpoint**: Scenario 1 Playwright test must pass before starting Phase 4.

---

## Phase 4: User Story 2 — Selectare Produse din Catalog la Crearea Comenzii (Priority: P1)

**Goal**: When creating a new order, the user can select products from the catalog via a searchable multi-select picker; selected products are created as kanban sub-tasks of the order atomically.

**Independent Test**: Create order "Test" with "Meniu nuntă" and "Place card" selected → verify both appear in the mini-board at "De făcut". See [quickstart.md Scenario 2](quickstart.md).

### Tests

- [X] T017 [P] [US2] Write Jest API integration test for extended `POST /api/orders` in `tests/integration/api.orders.test.js`: verify `{ name, templateIds: [id1, id2] }` creates order AND two products in one transaction; unknown templateId is skipped silently; empty templateIds array creates order with no products; returned body includes `products` array — tests must fail before T018–T019

### Implementation

- [X] T018 Add `createOrderWithProducts(name, templateIds)` to `src/lib/orders.js`: opens a transaction via `db.exec('BEGIN')`, calls `createOrder(name)`, then for each valid templateId calls `createProductFromTemplate(orderId, templateId)`, then `db.exec('COMMIT')`; on any error calls `db.exec('ROLLBACK')` and rethrows; unknown templateIds are skipped (template lookup returns null → skip)
- [X] T019 Modify `src/app/api/orders/route.js` `POST` handler: extract optional `templateIds` array from body (default `[]`); call `createOrderWithProducts(name, templateIds)` instead of `createOrder(name)`; return `{ order, products }` 201 — satisfies T017 tests
- [X] T020 Create `src/components/CatalogSelector.js` (`'use client'`): props: `mode` (`'multi'` | `'single'`), `onSelectionChange(selected: Template[])`, `placeholder`; internal state: `query` (filter input), `filtered` (client-side filtered list from fetched templates), `selected` (array); on mount `fetch('/api/catalog')` → store full list; render: text input that filters list by `query`; dropdown list of matching templates; clicking item adds chip (multi) or replaces selection (single); chips show name + × to remove; shows "Catalogul este gol — accesează /catalog pentru a adăuga produse" when no templates available; search response must appear within 300ms (client-side filter, no extra fetch)
- [X] T021 Modify `src/components/AddOrderForm.js`: import `CatalogSelector`; add local state `selectedTemplates = []`; render `CatalogSelector mode="multi" onSelectionChange={setSelectedTemplates}` below the name input; on submit pass `templateIds: selectedTemplates.map(t => t.id)` to `POST /api/orders`; update `onOrderAdded` call to receive `data.order` (response shape unchanged for parent); render products count hint below selector when items selected (e.g. "3 produse selectate")
- [X] T022 Modify `src/components/AddProductForm.js`: add toggle state `mode = 'manual' | 'catalog'`; show toggle buttons "Scrie manual" / "Din catalog"; in `'catalog'` mode render `CatalogSelector mode="single" onSelectionChange={...}` and on submit call `POST /api/products` with the selected template's `name` and `templateId`; `'manual'` mode is the existing form (default) — existing behavior must not change
- [X] T023 [US2] Playwright E2E — Scenario 2 (catalog selector in order creation) in `tests/e2e/catalog-selector.spec.js`: pre-condition setup creates catalog templates via API; creates order with multi-select; verifies products in mini-board

**Checkpoint**: Scenario 2 Playwright test must pass before starting Phase 5.

---

## Phase 5: User Story 3 — DnD de Produse din Catalog în Mini-Board (Priority: P2)

**Goal**: Products added from the catalog behave identically to manually-added products in the DnD kanban board.

**Independent Test**: Create order with catalog products; drag one from "De făcut" to "În Design"; reload; verify position persists. See [quickstart.md Scenario 4](quickstart.md).

- [X] T024 [US3] Verify `src/components/ProductCard.js` and `src/components/ProductBoard.js` handle the `templateId` field without errors: check that `parseRow` in `src/lib/products.js` already maps `template_id → templateId` (done in T007); confirm no component reads `product.template_id` (snake_case) directly — fix any such reference
- [X] T025 [P] [US3] Playwright E2E — Scenario 4 (DnD catalog products) in `tests/e2e/catalog-dnd.spec.js`: uses raw DragEvent (not `page.dragAndDrop`) per existing memory [feedback_playwright_dnd.md]; verifies column change persisted after reload; single worker to avoid shared DB conflicts per [feedback_playwright_isolation.md]

**Checkpoint**: Scenario 4 Playwright test passing confirms US3 complete without new production code.

---

## Phase 6: User Story 4 — Adăugare Manuală Ad-hoc în Comandă (Priority: P3)

**Goal**: Confirm manual product entry still works correctly alongside the new catalog toggle in `AddProductForm`.

**Independent Test**: Add "Produs unicat" manually to an existing order; verify it appears in mini-board; navigate to `/catalog`; verify it does NOT appear there. See [quickstart.md Scenario 5](quickstart.md).

- [X] T026 [US4] Verify `AddProductForm` manual mode (T022): confirm `mode = 'manual'` is the default; confirm manual submit does NOT send `templateId` in body; existing `POST /api/products` handler continues to create product with `templateId = null`
- [X] T027 [P] [US4] Playwright E2E — Scenario 5 (ad-hoc product entry) in `tests/e2e/adhoc-product.spec.js`: add product manually in "Scrie manual" mode; verify in mini-board; navigate to `/catalog`; verify absent from catalog
- [X] T028 [P] [US4] Playwright E2E — Scenario 6 (catalog delete does not break existing orders) in `tests/e2e/adhoc-product.spec.js`: create order with catalog product; delete template from catalog; verify order product still visible and draggable

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Code quality, accessibility, and full suite validation.

- [X] T029 [P] Review `src/styles/catalog.css` and `src/styles/form.css` for visual consistency: catalog selector chips match existing form style; error states use existing `.add-form-error` class pattern; empty-state text is visually distinguishable; all Romanian labels match spec exactly
- [X] T030 [P] ESLint + Prettier pass on all new and modified files: `src/lib/productTemplates.js`, `src/lib/db.js`, `src/lib/products.js`, `src/lib/orders.js`, `src/app/api/catalog/route.js`, `src/app/api/catalog/[id]/route.js`, `src/app/api/orders/route.js`, `src/app/catalog/page.js`, `src/components/CatalogPage.js`, `src/components/CatalogProductForm.js`, `src/components/CatalogSelector.js`, `src/components/AddOrderForm.js`, `src/components/AddProductForm.js`
- [X] T031 Run `npm test` — all Jest unit and integration tests must pass; coverage ≥80% on `src/lib/productTemplates.js`
- [X] T032 Run `npm run build` — zero build errors; no TypeScript/ESM import issues
- [X] T033 Run full Playwright suite — all 6 quickstart scenarios pass; run with `workers: 1` per existing isolation requirement

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — blocks all user story phases
- **US1 (Phase 3)**: Depends on Phase 2 — can start after T007
- **US2 (Phase 4)**: Depends on Phase 2 + T006/T007 — can start after foundational; ideally after Phase 3 (CatalogSelector fetches from `/api/catalog`)
- **US3 (Phase 5)**: Depends on Phase 4 complete (products must exist from catalog selection)
- **US4 (Phase 6)**: Depends on T022 (AddProductForm toggle)
- **Polish (Phase 7)**: Depends on all story phases complete

### User Story Dependencies

- **US1 (P1)**: Independent after Phase 2 — no dependency on US2/US3/US4
- **US2 (P1)**: Depends on US1 (`/api/catalog` must exist for `CatalogSelector` to fetch from)
- **US3 (P2)**: Depends on US2 (catalog products must be addable to orders)
- **US4 (P3)**: Depends on T022 from US2 (the toggle lives in `AddProductForm`)

### Within Each Phase

- Unit tests MUST be written (and failing) before the implementation tasks they cover
- Models/lib before API routes
- API routes before UI components
- Core component before parent that integrates it (e.g., `CatalogProductForm` before `CatalogPage`)
- Playwright E2E tests after implementation is complete

### Parallel Opportunities

- T004 and T005 can run in parallel (different test files)
- T006 and T007 can run in parallel once T003 is done (different lib files)
- T009, T010, T011, T012 can all run in parallel (different files)
- T015 and T016 can run in parallel (same test file but different test blocks)
- T025, T027, T028 can run in parallel (different test files)
- T029 and T030 can run in parallel

---

## Parallel Execution Examples

### Phase 2 — After T003 is done

```
T004 (unit tests for productTemplates.js)   [P]
T005 (unit tests for products.js)           [P]
  → then T006 (implement productTemplates.js)
  → then T007 (implement products.js)
```

### Phase 3 — After Phase 2

```
T008 (API integration tests catalog)   [P]
T009 (GET+POST /api/catalog)           [P]
T010 (PATCH+DELETE /api/catalog/[id])  [P]
T011 (catalog.css)                     [P]
T012 (CatalogProductForm.js)           [P]
  → then T013 (CatalogPage.js)
  → then T014 (catalog/page.js)
  → then T015, T016 (E2E) [P]
```

### Phase 4 — After Phase 3

```
T017 (integration test POST /api/orders)   [P with T018–T019]
T018 (createOrderWithProducts in orders.js)
T019 (extend POST /api/orders route)
T020 (CatalogSelector.js)
  → then T021 (AddOrderForm.js)
  → then T022 (AddProductForm.js)
  → then T023 (E2E)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: US1 (Catalog CRUD)
4. **STOP and VALIDATE**: Navigate to `http://localhost:3000/catalog`, run Scenario 1 manually
5. Deploy/demo if ready — catalog works end-to-end without touching order creation

### Incremental Delivery

1. Setup + Foundational → DB ready
2. US1 (Phase 3) → Catalog page live at `/catalog`
3. US2 (Phase 4) → Order creation uses catalog picker; products pre-populated
4. US3 (Phase 5) → Verify DnD; no new production code expected
5. US4 (Phase 6) → AddProductForm toggle confirmed working
6. Polish (Phase 7) → Full test suite; build check

---

## Notes

- **No `window.confirm()`** in CatalogPage delete flow — use inline "Ești sigur? [Confirmă] [Anulează]" UI pattern; `window.confirm()` returns `false` in Playwright headless mode (see [feedback_playwright_isolation.md](../../../.claude/projects/e--avify/memory/feedback_playwright_isolation.md))
- **Playwright DnD**: Use raw `DragEvent` via `page.evaluate`, not `page.dragAndDrop()` — see [feedback_playwright_dnd.md](../../../.claude/projects/e--avify/memory/feedback_playwright_dnd.md)
- **Playwright isolation**: Run with `workers: 1` to avoid shared SQLite DB race conditions
- **[P]** = different files, no blocking dependency on another incomplete task in the same phase
- Each user story phase is independently deployable — stop at any checkpoint to demo
