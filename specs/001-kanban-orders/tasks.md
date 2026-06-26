# Tasks: Kanban Board for Stationery Order Management

**Input**: Design documents from `/specs/001-kanban-orders/`

**Prerequisites**: [plan.md](plan.md) · [spec.md](spec.md) · [data-model.md](data-model.md) · [contracts/api.md](contracts/api.md) · [research.md](research.md)

**Note on tests**: The constitution (Principle II, NON-NEGOTIABLE) requires every user story to have at least one passing acceptance scenario before it is considered done. E2E acceptance tests and unit/integration tests for the data layer are therefore included. Test tasks are written **before** their corresponding implementation tasks and must fail before implementation begins.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on in-progress tasks)
- **[Story]**: Which user story this task belongs to — Setup and Foundational phases carry no story label
- All file paths are relative to the repository root

---

## Phase 1: Setup

**Purpose**: Project initialization and tooling configuration

- [x] T001 Initialize Next.js 14 project with App Router and install better-sqlite3 (package.json, next.config.js)
- [x] T002 Create directory structure: src/app/api/orders/[id]/, src/components/, src/lib/, src/styles/, data/, tests/unit/lib/, tests/integration/api/, tests/e2e/
- [x] T003 [P] Configure ESLint in eslint.config.js — extend Next.js defaults, enforce no-unused-vars and no-unreachable rules
- [x] T004 [P] Configure Prettier in .prettierrc (semi: true, singleQuote: true, printWidth: 100)
- [x] T005 [P] Configure Jest 29 in jest.config.js — use Next.js jest preset, set testEnvironment to node, support in-memory SQLite (:memory:) for tests/unit/ and tests/integration/
- [x] T006 [P] Configure Playwright in playwright.config.js — target http://localhost:3000, headless Chromium, test files at tests/e2e/**/*.spec.js

**Checkpoint**: Tooling configured — `npm run lint`, `npm test`, and `npm run test:e2e` are all runnable (will produce no test results yet)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 Implement src/lib/db.js — export singleton `db` (better-sqlite3 instance at data/avify.db); on first call, run CREATE TABLE IF NOT EXISTS for orders and product_types (full schema from data-model.md), create three indexes (idx_orders_stage, idx_orders_event_date, idx_orders_payment), run INSERT OR IGNORE to seed 7 system product types (pt-1 through pt-7)
- [x] T008 Implement src/lib/orders.js — export: `getAll(filters?)` with ORDER BY event_date ASC, created_at ASC; `getById(id)`; `create(data)`; `update(id, patch)`; `deleteOrder(id)`; private `parseRow` helper that maps snake_case columns to camelCase and calls JSON.parse on product_types field; `getAllProductTypes()`; `createProductType(name)`
- [x] T009 [P] Create src/app/layout.js — root layout, sets `<html lang="ro">`, imports src/app/globals.css, renders {children}
- [x] T010 [P] Create src/app/globals.css — CSS custom properties design system: --color-neachitat (red), --color-avans-achitat (amber), --color-achitat-integral (green), --color-danger, --color-warn, --color-ok; --space-xs through --space-xl spacing scale; base font-family and font-size; CSS reset (box-sizing: border-box, margin: 0)
- [x] T011 [P] Add data/avify.db to .gitignore; create data/.gitkeep so the directory is tracked by git

**Checkpoint**: Foundation ready — db.js and orders.js are complete; user story implementation can now begin

---

## Phase 3: User Story 1 — Create and Track a New Order (Priority: P1) 🎯 MVP

**Goal**: Manager can create an order card, see it in "De făcut", open a detail view, edit all fields, save, and delete. Data persists after page refresh.

**Independent Test**: Create a new order via the UI, verify it appears in "De făcut" with correct fields, edit the payment status, save, refresh — verify card still shows updated data.

### Tests for User Story 1 (write first — must fail before T015)

- [x] T012 [P] [US1] Write unit tests in tests/unit/lib/orders.test.js — cover getAll (sort order: soonest event date first, then FIFO tie-break), getById, create (generates UUID, sets created_at/updated_at, parses productTypes JSON), update (partial patch, sets updated_at), deleteOrder (returns truthy), parseRow mapping; use in-memory SQLite (:memory:)
- [x] T013 [P] [US1] Write integration tests in tests/integration/api/orders.test.js — cover POST /api/orders (201 + valid body; 400 for missing primaryName, missing eventDate, unknown eventType, empty productTypes); GET /api/orders/:id (200; 404); PUT /api/orders/:id (200 partial update; 404); DELETE /api/orders/:id (200; 404); use in-memory SQLite (:memory:) via jest mock of src/lib/db.js returning the in-memory instance
- [x] T014 [P] [US1] Write E2E acceptance test in tests/e2e/create-order.spec.js — US1 full flow: open board → click "Comandă nouă" → fill form → click Salvează → verify card in De făcut shows names, date, payment badge → click card → change paymentStatus → click Salvează → verify badge updated on card → refresh page → verify card still present with correct data → open card → click Șterge → confirm → verify card removed

### Implementation for User Story 1

- [x] T015 [US1] Implement GET /api/orders and POST /api/orders in src/app/api/orders/route.js — GET calls getAll(), returns { orders }; POST validates required fields (primaryName, eventDate, eventType, productTypes non-empty, paymentStatus), generates UUID via crypto.randomUUID(), calls create(), returns 201 { order }; all validation errors return 400 with Romanian message
- [x] T016 [US1] Implement GET, PUT, DELETE /api/orders/:id in src/app/api/orders/[id]/route.js — GET calls getById, 404 if null; PUT applies partial update (only provided fields), validates enum fields if present, returns updated order; DELETE calls deleteOrder, returns { success: true }; all return Romanian 404 messages
- [x] T017 [US1] Implement GET /api/product-types and POST /api/product-types in src/app/api/product-types/route.js — GET calls getAllProductTypes(), returns { productTypes }; POST validates name non-empty and unique, generates UUID, calls createProductType(), returns 201; duplicate name returns 400 "Tipul de produs există deja."
- [x] T018 [US1] Create src/styles/board.css — 6-column CSS Grid layout (repeat(6, 1fr) with min-width per column), column header styles, empty column placeholder text, column scrollbar for overflow cards
- [x] T019 [US1] Create src/styles/card.css — card container (border, border-radius, padding, shadow), primary/secondary name typography, event-date row, event-type badge (Nuntă / Botez label), payment-status badge using --color-* custom properties, hover and focus-visible states
- [x] T020 [US1] Create src/styles/form.css — modal overlay (fixed, full-screen, semi-transparent backdrop), modal container (max-width, padding, border-radius), form field label + input pairs, product-type checkbox grid, Salvează button (primary), Anulează and Șterge buttons (secondary/danger), error message style
- [x] T021 [US1] Create src/components/Column.js — receives: stageName (display), stageId (DB value), orders (array), onCardClick; renders column header with stageName, list of OrderCard components sorted by eventDate ASC then createdAt ASC (already sorted by API, just render in order), empty state "Nicio comandă" message when orders.length === 0; exports as default
- [x] T022 [US1] Create src/components/OrderCard.js — receives: order object, onClick; renders card face: primaryName / secondaryName (if present), formatted eventDate (DD.MM.YYYY), eventType badge (Nuntă|Botez), paymentStatus badge with correct --color-* token; tabIndex="0" + onKeyDown Enter/Space = onClick for keyboard accessibility; exports as default
- [x] T023 [US1] Create src/components/OrderForm.js — 'use client'; receives: order (null = create mode, object = edit mode), productTypesList, onSave(updatedOrder), onDelete(id), onClose; local useState for all form fields; dirty state tracked (isDirty); Salvează calls onSave with form data; close/cancel checks isDirty and shows window.confirm("Ai modificări nesalvate. Sigur vrei să închizi?") if true; Șterge shows window.confirm("Sigur vrei să ștergi această comandă?") then calls onDelete; renders as modal overlay; exports as default
- [x] T024 [US1] Create src/components/Board.js — 'use client'; receives: initialOrders, initialProductTypes; useState for orders, productTypes, selectedOrder, isFormOpen; fetchOrders() helper calls GET /api/orders and setState; handleSave calls POST (create) or PUT (edit) then fetchOrders(); handleDelete calls DELETE then fetchOrders(); handleMoveOrder calls PUT then fetchOrders() (needed by US2, wire up now); renders FilterBar (US3 placeholder — passes all orders through until US3), six Column components mapped from STAGES constant, OrderForm modal (when isFormOpen), "Comandă nouă" button; exports as default
- [x] T025 [US1] Update src/app/page.js — async server component; imports db.js via dynamic import to avoid client bundle; calls getAll() (or fetches from /api/orders); passes initialOrders and initialProductTypes as props to Board; exports as default

**Checkpoint**: US1 complete — create, view, edit, delete orders; all data persists after refresh; unit + integration + E2E tests pass

---

## Phase 4: User Story 2 — Move Orders Through the Production Workflow (Priority: P2)

**Goal**: Manager can drag a card from any column to any other column; the move persists after page refresh; backward movement is allowed.

**Independent Test**: Use API to seed one order; drag it from "De făcut" to "În design"; verify card is in "În design" and absent from "De făcut"; refresh — verify card remains in "În design".

### Tests for User Story 2 (write first — must fail before T027)

- [x] T026 [P] [US2] Write E2E acceptance test in tests/e2e/move-order.spec.js — seed order via POST /api/orders; drag card to next column; assert card in new column, absent from old; refresh; assert still in new column; drag backward; assert card in previous column; use playwright drag helpers for the DnD interaction

### Implementation for User Story 2

- [x] T027 [US2] Add drag-and-drop to src/components/OrderCard.js — set `draggable={true}`; add `onDragStart` handler (calls event.dataTransfer.setData('orderId', order.id)); add keyboard accessibility: a "Mută în…" `<select>` or button revealed on focus for WCAG AA compliance (calls onMoveOrder(order.id, targetStage)); update card.css for dragging visual feedback (opacity 0.5 while dragging)
- [x] T028 [US2] Add DnD drop target to src/components/Column.js — add `onDragOver` (event.preventDefault()); add `onDrop` handler (reads orderId from dataTransfer, calls onMoveOrder(orderId, stageId) prop); add dragover CSS class for visual drop-target highlight (border-color change using --color-ok); wire onMoveOrder prop through Column to OrderCard; Board.handleMoveOrder (already wired in T024) calls PUT /api/orders/:id with { stage: stageId } then fetchOrders()

**Checkpoint**: US2 complete — drag-and-drop moves persist after refresh; backward movement works; keyboard move fallback works; E2E tests pass

---

## Phase 5: User Story 3 — Filter and Review Orders by Status or Date (Priority: P3)

**Goal**: Manager can filter visible cards by payment status or event date range; column structure stays visible even when no cards match; filters clear instantly.

**Independent Test**: Seed 3 orders with different payment statuses; filter by "Neachitat" — only Neachitat cards visible in their respective columns; clear filter — all 3 cards reappear.

### Tests for User Story 3 (write first — must fail before T030)

- [x] T029 [P] [US3] Write E2E acceptance test in tests/e2e/filter-orders.spec.js — seed 3 orders (different paymentStatus, different eventDates); select "Neachitat" in filter → verify only Neachitat cards visible, column headers still rendered; select "Toate" → verify all 3 cards visible; click "Următoarele 30 de zile" with one order in range → verify only that card visible; click "Șterge filtre" → verify all 3 cards visible

### Implementation for User Story 3

- [x] T030 [US3] Create src/components/FilterBar.js — 'use client'; receives onFilterChange(filters) callback; local state for paymentStatus (default ''), eventDateFrom (default ''), eventDateTo (default ''); renders: payment status `<select>` (options: Toate / Neachitat / Avans achitat / Achitat integral), date-from and date-to `<input type="date">`, "Următoarele 30 de zile" `<button>` (computes today and today+30d, sets both date fields), "Șterge filtre" `<button>` (resets all fields to default); calls onFilterChange on any change; exports as default
- [x] T031 [US3] Add filter state and client-side filter logic to src/components/Board.js — add useState for filters ({paymentStatus:'', eventDateFrom:'', eventDateTo:''}); compute filteredOrders = orders.filter(o => (no paymentStatus filter OR o.paymentStatus === filters.paymentStatus) AND (no dateFrom OR o.eventDate >= filters.eventDateFrom) AND (no dateTo OR o.eventDate <= filters.eventDateTo)); pass filteredOrders (not orders) to Column components; add FilterBar above the columns grid with onFilterChange={setFilters}; all 6 columns always render regardless of filteredOrders length

**Checkpoint**: US3 complete — all 3 user stories functional; E2E tests pass for all three

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Quality gates from the constitution — accessibility, Romanian text audit, coverage, performance

- [x] T032 [P] WCAG 2.1 AA audit — add role="dialog" aria-modal="true" aria-labelledby to OrderForm modal; add aria-label to icon-only buttons; add aria-live="polite" region for filter result count; verify Tab order enters modal and is trapped; verify Escape key closes modal (calls onClose with dirty check); verify focus returns to trigger card after modal closes
- [x] T033 [P] Romanian text audit — verify all visible strings match spec exactly: column headers (De făcut, În design, Validare client, Printare, Asamblare, Livrat), payment badges (Neachitat, Avans achitat, Achitat integral), event type (Nuntă, Botez), button labels (Comandă nouă, Salvează, Anulează, Șterge, Mută în, Următoarele 30 de zile, Șterge filtre, Toate), empty column text (Nicio comandă); no English strings in production paths
- [x] T034 [P] Run ESLint (`npm run lint`) and Prettier (`npx prettier --check .`) — fix all violations; zero lint errors/warnings in production paths (constitution Principle I)
- [x] T035 [P] Run Jest with coverage (`npm test -- --coverage`) — verify ≥80% line coverage on src/lib/ (constitution requirement); if below 80%, add targeted tests in tests/unit/ for uncovered query branches (e.g., getAll with each filter combination, update with null secondaryName, create with notes field)
- [ ] T036 [P] Run Playwright E2E suite (`npm run test:e2e`) — verify all 3 acceptance tests (create-order.spec.js, move-order.spec.js, filter-orders.spec.js) pass green; fix any brittle selectors or timing issues
- [ ] T037 Validate all quickstart.md scenarios manually against the running app (npm run dev) — verify all 6 sections: US1 flow, US2 flow, US3 flow, sort order, unsaved-changes warning, delete order; record any discrepancies

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Requires Phase 1 complete — **BLOCKS all user stories**
- **US1 (Phase 3)**: Requires Phase 2 complete; no dependency on US2 or US3
- **US2 (Phase 4)**: Requires Phase 2 complete; requires US1 complete for meaningful UI (OrderCard and Board must exist)
- **US3 (Phase 5)**: Requires Phase 2 complete; requires US1 complete (Board and Column must exist); no dependency on US2
- **Polish (Phase 6)**: Requires all desired user stories complete

### User Story Dependencies

- **US1 (P1)**: Can start immediately after Foundational — no story dependencies
- **US2 (P2)**: Can start after Foundational; adds DnD to components created in US1 — US1 must be complete
- **US3 (P3)**: Can start after US1 is complete (Board.js and Column.js exist); can run parallel to US2

### Within Each User Story

1. Write tests first (TDD-preferred per constitution) — verify they fail
2. Implement in order: API routes → styles → components (leaf → parent: OrderCard → Column → OrderForm → Board → page)
3. Verify tests pass after implementation
4. Story complete before marking checkpoint

### Parallel Opportunities

- Phase 1: T003, T004, T005, T006 all parallel (different config files)
- Phase 2: T009, T010, T011 parallel (different files, no inter-dependencies)
- Phase 3 tests: T012, T013, T014 parallel (different test files)
- Phase 3 implementation: T018, T019, T020 parallel (different CSS files); T021, T022 parallel after T018/T019/T020
- Phase 4: T026 parallel with T027 (different files — OrderCard vs Column)
- Phase 5: T029 parallel with T030 (test vs component)
- Phase 6: T032, T033, T034, T035, T036 all parallel

---

## Parallel Examples

### Phase 3 — CSS files (no dependency):

```
Task T018: Create src/styles/board.css
Task T019: Create src/styles/card.css
Task T020: Create src/styles/form.css
```

### Phase 3 — Test files (write before implementation):

```
Task T012: tests/unit/lib/orders.test.js
Task T013: tests/integration/api/orders.test.js
Task T014: tests/e2e/create-order.spec.js
```

### Phase 4 — DnD implementation:

```
Task T026: Add draggable to src/components/OrderCard.js
Task T027: Add drop target to src/components/Column.js
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Write US1 tests (T012, T013, T014) — verify they fail
4. Complete Phase 3: US1 implementation (T015–T025)
5. **STOP and VALIDATE**: All US1 tests pass; manual walkthrough of quickstart.md US1 section
6. Demo or continue to US2

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → board is usable for order creation and tracking (MVP)
3. US2 → board gains workflow movement
4. US3 → board gains filtering for financial oversight
5. Polish → quality gates, accessibility, coverage check

---

## Notes

- [P] tasks = different files, no dependency on in-progress tasks — safe to parallelize
- [US?] label maps each task to its user story for traceability
- Constitution Principle II (NON-NEGOTIABLE): tests must fail before implementation, integration tests run against real dependencies (no database mocks in integration tests — use in-memory SQLite instance, not jest.fn stubs)
- Stop at each checkpoint to validate the story independently before moving to the next
- Commit after each logical group (task or checkpoint)
- Zero lint errors required before final commit (constitution Principle I)
