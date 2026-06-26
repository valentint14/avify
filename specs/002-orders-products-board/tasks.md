# Tasks: Orders & Products Board

**Input**: Design documents from `/specs/002-orders-products-board/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/api.md](contracts/api.md)

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no in-flight dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)
- File paths are relative to the repository root

---

## Phase 1: Setup — Remove Legacy Code & Update Constants

**Purpose**: Remove files that are entirely replaced by the new design and update
shared constants so downstream phases build on a clean foundation.

- [X] T001 Remove src/components/Board.js, src/components/Column.js, src/components/OrderCard.js, src/components/OrderForm.js, src/components/FilterBar.js
- [X] T002 Remove src/app/api/product-types/ directory and its route.js
- [X] T003 [P] Remove src/styles/board.css and src/styles/card.css
- [X] T004 Update src/lib/constants.js: rename `livrat` → `gata` in STAGES array and VALID_STAGES; update CHECK label to `'Gata'`; remove VALID_PAYMENT, PAYMENT_LABELS, VALID_EVENTS, EVENT_LABELS exports

---

## Phase 2: Foundational — Database, Lib Layer & API Routes

**Purpose**: Core data layer and API that ALL user stories depend on. No user story
implementation can begin until this phase is complete.

**⚠️ CRITICAL**: This phase MUST be complete before any Phase 3+ task starts.

- [X] T005 Update src/lib/db.js: add `products` table DDL and indexes (`idx_products_order_id`, `idx_products_status`) after the existing `orders` table block; keep all existing `orders` DDL unchanged
- [X] T006 Replace src/lib/orders.js: implement `getAllWithStatus()` using the derived-status LEFT JOIN SQL from data-model.md; implement `createOrder(name)` and `deleteOrder(id)` — remove all legacy stage/payment/event-type functions
- [X] T007 [P] Create src/lib/products.js: implement `getProductsByOrder(orderId)`, `createProduct(orderId, name)`, `updateProductStatus(productId, status)`, `deleteProduct(productId)` using `node:sqlite`
- [X] T008 Replace src/app/api/orders/route.js: `GET /api/orders` returns `{ orders }` with derived status/counts per contracts/api.md; `POST /api/orders` validates non-empty name and returns 201 with new order
- [X] T009 Replace src/app/api/orders/[id]/route.js: `DELETE /api/orders/:id` returns 200 `{ deleted: true }` or 404; remove PUT handler entirely
- [X] T010 [P] Create src/app/api/products/route.js: `GET /api/products?orderId=` returns `{ products }` or 400 if missing; `POST /api/products` validates orderId + name, returns 201
- [X] T011 [P] Create src/app/api/products/[id]/route.js: `PATCH /api/products/:id` validates status against VALID_STAGES, returns 200 or 400/404; `DELETE /api/products/:id` returns 200 or 404

**Checkpoint**: Foundation ready — API endpoints callable via `curl`, lib layer testable in isolation.

---

## Phase 3: User Story 1 — Browse Orders List (Priority: P1) 🎯 MVP

**Goal**: Main screen shows all orders with name, status badge, and product count summary.

**Independent Test**: Seed the DB with 2 orders (one with all products in Gata, one with mixed), start the dev server, open the browser — both orders appear with correct badges and counts.

### Tests

- [X] T012 [P] [US1] Write Jest unit tests for src/lib/orders.js in tests/unit/lib/orders.test.js: test `getAllWithStatus()` with in-memory SQLite — cases: empty DB, order with no products (→ `in_progres`), order with all products in `gata` (→ `finalizata`), mixed-status products
- [X] T013 [P] [US1] Write Jest integration test for `GET /api/orders` in tests/integration/api/orders.test.js: response shape matches contracts/api.md, derived status is correct

### Implementation

- [X] T014 [US1] Create src/components/OrderRow.js: renders one row with order `name`, status badge (`Finalizată` / `În progres`), and product count (`{doneCount} / {productCount} gata`); receives `order` and `isExpanded` props; click calls `onToggle(order.id)`
- [X] T015 [US1] Create src/components/OrderList.js (list only, no expand logic yet): `'use client'`; fetches orders via `GET /api/orders` on mount; renders `OrderRow` for each; manages `orders` state; exports `expandedOrderId` state as null placeholder
- [X] T016 [US1] Update src/app/page.js: fetch initial orders server-side with `getAllWithStatus()`, pass as `initialOrders` prop to `OrderList`
- [X] T017 [P] [US1] Create src/styles/order-list.css: `.order-list`, `.order-row`, `.order-row-header`, `.status-badge`, `.status-badge--finalizata`, `.status-badge--in-progres`, `.product-summary`; layout is a vertical stack
- [X] T018 [P] [US1] Update src/app/globals.css: add CSS custom properties for new UI — `--color-finalizata`, `--color-in-progres`, `--color-surface`, `--color-border`, `--spacing-*`, `--radius-*`

**Checkpoint**: Open `http://localhost:3000` and verify the orders list renders correctly with status badges.

---

## Phase 4: User Story 2 — Expand Order / Mini-Board (Priority: P1)

**Goal**: Clicking an order row expands it inline showing the 6-column mini Kanban board with the order's products. Only one order expanded at a time.

**Independent Test**: Click an order with products — mini-board appears with products in their correct columns. Click again — board collapses. Click a second order — first collapses, second expands.

### Tests

- [X] T019 [P] [US2] Write Playwright E2E for US2 in tests/e2e/expand-order.spec.js: expand/collapse click, accordion behaviour (only one open), empty board state

### Implementation

- [X] T020 [US2] Update src/components/OrderList.js: add `expandedOrderId` state (string | null); pass `isExpanded` and `onToggle` to `OrderRow`; render `ProductBoard` below the expanded row (or null when collapsed)
- [X] T021 [US2] Create src/components/ProductBoard.js: `'use client'`; receives `orderId` and `onProductChange` props; fetches products via `GET /api/products?orderId=` on mount; renders 6 `ProductColumn` components (one per STAGES entry); manages `products` state
- [X] T022 [P] [US2] Create src/components/ProductColumn.js: receives `stageName`, `stageId`, `products` array; renders column header (label + count) and a `ProductCard` per product; empty state message `"Niciun produs"` when empty; no DnD yet
- [X] T023 [P] [US2] Create src/components/ProductCard.js: renders product `name` in a card; no DnD yet
- [X] T024 [US2] Wire `ProductBoard` into `OrderList.js`: render `<ProductBoard orderId={expandedOrderId} />` in the expanded region below the matching `OrderRow`
- [X] T025 [P] [US2] Create src/styles/product-board.css: `.product-board`, `.product-board-columns`, `.product-column`, `.product-column-header`, `.product-column-count`, `.product-column-cards`, `.product-column-empty`, `.product-card`; board columns displayed as a horizontal flex row

**Checkpoint**: Expand an order — 6 labelled columns appear with the order's products placed correctly.

---

## Phase 5: User Story 3 — Drag-and-Drop Products (Priority: P1)

**Goal**: Products can be dragged from one column and dropped into another. Change persists immediately and survives page reload.

**Independent Test**: Drag a product card to a different column — card appears in the new column. Reload page — card is still in the new column.

### Tests

- [X] T026 [P] [US3] Write Jest unit tests for src/lib/products.js in tests/unit/lib/products.test.js: test `updateProductStatus()` with valid and invalid status values; test `getProductsByOrder()` return shape
- [X] T027 [P] [US3] Write Jest integration test for `PATCH /api/products/:id` in tests/integration/api/products.test.js: valid status update returns 200 with updated product; invalid status returns 400; unknown id returns 404
- [X] T028 [P] [US3] Write Playwright E2E for US3 in tests/e2e/drag-drop.spec.js: drag product to new column → card moves; reload → persists; drop on same column → no change

### Implementation

- [X] T029 [US3] Update src/components/ProductCard.js: add `draggable={true}` and `onDragStart` handler that calls `e.dataTransfer.setData('productId', product.id)` and `e.dataTransfer.setData('fromStage', product.status)`
- [X] T030 [US3] Update src/components/ProductColumn.js: add `onDrop` prop callback; add `isDragOver` local state; add `onDragOver` (preventDefault), `onDragLeave`, and `onDrop` handlers; apply `.drag-over` class when `isDragOver` is true
- [X] T031 [US3] Update src/components/ProductBoard.js: pass `onDrop={handleDrop}` to each `ProductColumn`; implement `handleDrop(productId, fromStage, toStageId)` that calls `PATCH /api/products/:id` with `{ status: toStageId }` then updates local `products` state
- [X] T032 [US3] Update src/components/ProductBoard.js: after successful PATCH in `handleDrop`, call `onProductChange(orderId)` callback prop to notify parent that order counts may have changed
- [X] T033 [P] [US3] Update src/styles/product-board.css: add `.product-card` `cursor: grab` and `dragging` opacity; add `.product-column.drag-over` highlight style (border or background)

**Checkpoint**: Drag a product card to another column — it moves immediately and persists after reload.

---

## Phase 6: User Story 4 — Auto-Complete Order (Priority: P2)

**Goal**: When the last product reaches "Gata", the order badge changes to "Finalizată" in the list **without page reload**. Moving a product back reverts the status.

**Independent Test**: With one product, drag it to "Gata" — order badge immediately shows "Finalizată". Drag it back to any other column — badge reverts to "În progres".

### Tests

- [X] T034 [P] [US4] Write Playwright E2E for US4 in tests/e2e/auto-complete.spec.js: last product to Gata → order becomes Finalizată immediately; move product back → order reverts to În progres; multi-product order only completes when ALL in Gata

### Implementation

- [X] T035 [US4] Update src/components/OrderList.js: implement `handleProductChange(orderId)` that calls `GET /api/orders` and replaces `orders` state; pass `onProductChange={handleProductChange}` to `ProductBoard`
- [X] T036 [US4] Verify `OrderRow.js` correctly applies the `status-badge--finalizata` CSS class when `order.status === 'finalizata'` — add visual treatment: green badge + optional strikethrough on order name
- [X] T037 [P] [US4] Update src/styles/order-list.css: style `.status-badge--finalizata` distinctly (green background or checkmark icon via CSS); ensure the badge transition is visible without animation library

**Checkpoint**: Drag the last product to "Gata" — the order row updates immediately to "Finalizată" without any page reload.

---

## Phase 7: User Story 5 — Add Orders and Products (Priority: P2)

**Goal**: New orders can be created from the main screen. New products can be added to any expanded order. Both are validated (empty names rejected with Romanian error messages).

**Independent Test**: Click "Adaugă comandă", type a name, confirm → order appears in list. Expand it, click "Adaugă produs", type a name → product appears in "De făcut". Submit empty name → form blocks with error message.

### Tests

- [X] T038 [P] [US5] Write Jest integration tests for `POST /api/orders` and `POST /api/products` in tests/integration/api/orders.test.js and products.test.js: valid create returns 201; empty name returns 400 with Romanian error
- [X] T039 [P] [US5] Write Playwright E2E for US5 in tests/e2e/add-items.spec.js: add order → appears in list; add product to expanded order → appears in De făcut; empty name submission → blocked

### Implementation

- [X] T040 [US5] Create src/components/AddOrderForm.js: inline form with single text input and confirm button; calls `POST /api/orders` with `{ name }`; shows Romanian validation error on empty submit; calls `onOrderAdded` callback prop on success; clears input after success
- [X] T041 [US5] Update src/components/OrderList.js: render `AddOrderForm` at the top of the list; implement `handleOrderAdded` that adds the new order to local `orders` state and re-fetches to get correct counts
- [X] T042 [US5] Create src/components/AddProductForm.js: inline form with single text input and confirm button rendered inside `ProductBoard`; calls `POST /api/products` with `{ orderId, name }`; shows Romanian validation error on empty submit; calls `onProductAdded` callback prop on success
- [X] T043 [US5] Update src/components/ProductBoard.js: render `AddProductForm` below the column grid; implement `handleProductAdded` that adds the new product to local `products` state in the `de_facut` column and calls `onProductChange(orderId)` to update order counts in the list

**Checkpoint**: Full create → expand → add product → move product → auto-complete flow works end-to-end.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Empty states, delete operations, accessibility, and final validation.

- [X] T044 [P] Update src/components/OrderList.js: add empty state `<p className="order-list-empty">Nu există comenzi. Adaugă prima comandă.</p>` when `orders.length === 0`
- [X] T045 [P] Verify src/components/ProductColumn.js empty state reads `"Niciun produs în această coloană"` and is correctly styled in product-board.css
- [X] T046 Add delete order: add a delete button to `OrderRow.js` (visible on hover or always); show Romanian confirmation dialog before calling `DELETE /api/orders/:id`; update `OrderList.js` state on success
- [X] T047 Add delete product: add a delete control to `ProductCard.js`; call `DELETE /api/products/:id`; update `ProductBoard.js` products state and call `onProductChange`
- [X] T048 [P] Keyboard accessibility: ensure "Adaugă comandă" and "Adaugă produs" buttons are focusable via Tab; ensure order expand/collapse is triggered by Enter/Space on the row header; verify in browser
- [X] T049 Run Jest test suite (`npm test`) and verify ≥80% line coverage on src/lib/orders.js and src/lib/products.js; fix any failing tests
- [X] T050 Run Playwright E2E suite (`npm run test:e2e`) and verify all scenarios from quickstart.md pass
- [X] T051 [P] ESLint pass: run linter on all new and modified files; fix any warnings or errors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 completion — BLOCKS all user stories
- **Phase 3 (US1)**: Depends on Phase 2 — first story, no story dependencies
- **Phase 4 (US2)**: Depends on Phase 3 completion — requires the order list to exist
- **Phase 5 (US3)**: Depends on Phase 4 completion — requires the mini-board to exist
- **Phase 6 (US4)**: Depends on Phase 5 completion — requires DnD to be wired up
- **Phase 7 (US5)**: Depends on Phase 3 (needs the list), integrates with Phase 4–6
- **Phase 8 (Polish)**: Depends on all phases 3–7

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 — no story dependencies
- **US2 (P1)**: Requires US1 (needs the order list to expand into)
- **US3 (P1)**: Requires US2 (needs the mini-board to add DnD to)
- **US4 (P2)**: Requires US3 (derived status update triggered by product drop)
- **US5 (P2)**: Requires US1 for order create; requires US2 for product create; independent of US3/US4

### Within Each Phase

- Test tasks [P] can be written in parallel with unrelated implementation tasks
- Implementation tasks within a story follow component dependency order:
  lib → API routes → server component → client components → styles

---

## Parallel Example: Phase 2

```
T005 (db.js)            ← must complete first
T006 (orders.js)        ← depends on T005
T007 [P] (products.js)  ← depends on T005, runs in parallel with T006
T008 (orders route)     ← depends on T006
T009 (orders/[id])      ← depends on T006, parallel with T008
T010 [P] (products route)   ← depends on T007
T011 [P] (products/[id])    ← depends on T007, parallel with T010
```

## Parallel Example: Phase 5 (US3)

```
T026 [P] Jest unit tests (products.js)      ← parallel with T027, T028
T027 [P] Jest integration tests (PATCH)     ← parallel with T026, T028
T028 [P] Playwright E2E (drag-drop)         ← parallel with T026, T027
T029 ProductCard.js DnD                     ← after T028 written (TDD)
T030 ProductColumn.js drop handlers         ← after T029
T031 ProductBoard.js handleDrop + PATCH     ← after T029, T030
T032 ProductBoard.js onProductChange        ← after T031
T033 [P] product-board.css DnD styles       ← parallel with T029–T032
```

---

## Implementation Strategy

### MVP First (US1 + US2 + US3 = core P1 flow)

1. Complete Phase 1: Setup (clean slate)
2. Complete Phase 2: Foundational (API + lib)
3. Complete Phase 3: US1 (list view visible)
4. **VALIDATE**: Orders list loads, correct status badges
5. Complete Phase 4: US2 (expand to mini-board)
6. **VALIDATE**: Click to expand, 6 columns appear with products
7. Complete Phase 5: US3 (drag-and-drop)
8. **VALIDATE**: Drag product → persists after reload
9. **STOP — core P1 flow is complete and usable**

### Incremental Delivery After MVP

10. Phase 6: US4 → Auto-complete logic visible in UI
11. Phase 7: US5 → Add new orders and products from UI
12. Phase 8: Polish → Empty states, delete, accessibility, full test suite

---

## Notes

- `[P]` tasks operate on different files with no dependency on in-progress work
- Each `[Story]` label maps directly to the user story in spec.md
- Test tasks appear before implementation tasks within each story phase (TDD-preferred per constitution)
- The constitution requires ≥80% unit coverage on new `src/lib/` code and at least one passing E2E per user story before the story is considered done
- All user-facing strings must be in Romanian and match spec terminology exactly
- No new npm dependencies are introduced — HTML5 DnD, `node:sqlite`, `useState`/`useReducer` only
