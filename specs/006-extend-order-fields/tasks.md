---
description: "Task list for feature: Extend Order Fields & Auto-Calculated Totals"
---

# Tasks: Extend Order Fields & Auto-Calculated Totals

**Input**: Design documents from `specs/006-extend-order-fields/`

**Prerequisites**: [plan.md](plan.md) · [spec.md](spec.md) · [research.md](research.md) · [data-model.md](data-model.md) · [contracts/api.md](contracts/api.md)

**Organization**: Tasks grouped by user story to enable independent delivery of each increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other [P]-marked tasks in the same phase (different files, no incomplete dependencies)
- **[Story]**: Traceability label mapping to user stories in spec.md
- Each task description includes the exact file path to change

---

## Phase 1: Setup

**Purpose**: Confirm working environment — no new directories or dependencies needed for this feature.

- [X] T001 Confirm Node.js ≥ 22 is available (`node --version`) and `npm run dev` starts cleanly before making any changes

---

## Phase 2: Foundational (DB & Data Layer)

**Purpose**: Extend the SQLite schema and data-access layer with all new columns. All user stories depend on this phase completing first.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 Extend `src/lib/db.js` — add `ALTER TABLE` guards for 10 new `orders` columns (`client TEXT`, `reception_date TEXT`, `advance REAL DEFAULT 0`, `county TEXT`, `contact_platform TEXT`, `event_date TEXT`, `delivery_date TEXT`, `profit REAL DEFAULT 0`, `collected INTEGER NOT NULL DEFAULT 0`, `delivered INTEGER NOT NULL DEFAULT 0`) and 1 new `products` column (`unit_price REAL DEFAULT 0`) following the existing `if (!cols.some(c => c.name === '...'))` pattern
- [X] T003 [P] Extend `src/lib/orders.js` — update `DERIVED_STATUS_SQL` to add `SUM(COALESCE(p.quantity, 0) * COALESCE(p.unit_price, 0)) AS total`; extend `parseRow` to map all 10 new order columns to camelCase JavaScript properties (`client`, `receptionDate`, `advance`, `county`, `contactPlatform`, `eventDate`, `deliveryDate`, `profit`, `collected` as `Boolean(row.collected)`, `delivered` as `Boolean(row.delivered)`, `total` as `Number(row.total)`)
- [X] T004 [P] Extend `src/lib/products.js` — add `unitPrice: Number(row.unit_price ?? 0)` to `parseRow`; add `unit_price` to the `allowed` fields in `updateProduct` with the same validation pattern as `quantity`

**Checkpoint**: `GET /api/orders` should now return all new fields (with default/null values) and `total: 0` without any UI changes.

---

## Phase 3: User Story 1 — Complete Order with All Client & Logistics Fields (Priority: P1) 🎯 MVP

**Goal**: Users can edit and persist all 10 new order-level fields (client, dates, advance, county, contact platform, collected, delivered) through the existing "Editează" modal; saved values survive a page reload.

**Independent Test**: Open the edit modal for any order, fill in all 10 new fields, save, reload the page, reopen the modal — all values must be pre-populated exactly as entered.

- [X] T005 Add `updateOrder(id, fields)` function to `src/lib/orders.js` — accepts any subset of the 10 new order fields, builds a parameterized `UPDATE orders SET ... WHERE id = ?`, returns the updated order via `getOrderById(id)`; returns `null` if no valid fields supplied or order not found
- [X] T006 Add `PATCH` handler to `src/app/api/orders/[id]/route.js` — parse request body, validate that at least one known field is present, call `updateOrder`, return `{ order }` on success; return 400 if no valid fields, 404 if order not found
- [X] T007 [P] Extend `POST` handler in `src/app/api/orders/route.js` — pass new fields from request body to `createOrder` (update `createOrder` signature in `orders.js` to accept and persist an optional `fields` object)
- [X] T008 [P] Add Order Details section styles to `src/styles/product-modal.css` — `.edit-modal-order-details` container, a 2-column CSS grid for the field inputs, label/input pairs styled consistently with existing `.edit-modal-label` and `.edit-modal-input-qty`, toggle switch or checkbox styles for `collected`/`delivered` boolean fields
- [X] T009 Extend `src/components/EditOrderModal.js` — add Order Details collapsible section above the Products section; include inputs for: `client` (text), `receptionDate` (date), `advance` (number, min 0), `county` (text), `contactPlatform` (`<select>` with Facebook/Instagram/TikTok/Telefon/Email/Altele options — selecting "Altele" reveals a free-text input), `eventDate` (date), `deliveryDate` (date), `collected` (checkbox/toggle), `delivered` (checkbox/toggle); fetch existing order metadata on modal open via `GET /api/orders` or a new `GET /api/orders/[id]` call; persist via `PATCH /api/orders/[orderId]` on save alongside existing product saves

**Checkpoint**: User Story 1 is independently testable — open any order's edit modal, fill all new fields, save, reload, reopen — values persist.

---

## Phase 4: User Story 2 — Unit Price per Product & Auto-Calculated Order Total (Priority: P1)

**Goal**: Each product in an order has a "Preț unitar" (unit price) field. The system auto-computes Order Total = Σ(quantity × unit_price) and displays it in the main order row and in the edit modal.

**Independent Test**: Add two products to an order, set unit prices (e.g. 50 and 120 RON), set quantities (3 and 2), save — the order row shows Total: 390 RON without expanding.

- [X] T010 [P] Extend `PATCH` handler in `src/app/api/products/[id]/route.js` — add `unitPrice` field: validate it is a finite number ≥ 0, pass to `updateProduct` as `unit_price`; return 400 with `"Prețul unitar trebuie să fie un număr pozitiv."` on invalid value
- [X] T011 [P] Add unit price and total summary styles to `src/styles/product-modal.css` — `.edit-modal-field--unit-price` for the new field column, `.edit-modal-total-summary` for the read-only total display at the bottom of the modal body
- [X] T012 Extend `src/components/EditOrderModal.js` — add `Preț unitar` number input (min 0, step 0.01) to each product row in the Products section alongside the existing Quantity and Notes fields; add a read-only computed total summary line at the bottom of the product list: `Total comandă: X RON` computed client-side as `Σ(quantity × unitPrice)`; include `unitPrice` in the `body` sent to `PATCH /api/products/[id]` when saving dirty products
- [X] T013 [P] Add total display styles to `src/styles/order-list.css` — `.order-row-total` class for the total value chip/cell in the main row header area
- [X] T014 Extend `src/components/OrderRow.js` — render `order.total` formatted as `{order.total.toFixed(2)} RON` inside a `.order-row-total` span in `.order-row-actions` (visible at all times without expanding)

**Checkpoint**: Order row shows correct total after saving product prices; total in modal footer matches total in order row.

---

## Phase 5: User Story 3 — Profit Display (Priority: P2)

**Goal**: Each order displays a Profit value (manually entered) in both the main order row and the edit modal Order Details section.

**Independent Test**: Enter Profit = 150 RON in the edit modal for an order, save — the order row shows `Profit: 150 RON` alongside the Total without any expansion required.

- [X] T015 [P] Add profit display styles to `src/styles/order-list.css` — `.order-row-profit` class styled similarly to `.order-row-total`
- [X] T016 Extend `src/components/OrderRow.js` — render `order.profit` formatted as `{order.profit.toFixed(2)} RON` inside a `.order-row-profit` span in `.order-row-actions`, adjacent to the total display (depends on T014)
- [X] T017 Extend `src/components/EditOrderModal.js` — add `Profit` number input (step 0.01, no min — can be negative) to the Order Details section in the edit modal; this field is already persisted via `PATCH /api/orders/[orderId]` wired in T009 — only the UI input is missing (depends on T009)

**Checkpoint**: Profit value entered in modal appears in the order row immediately after saving.

---

## Phase 6: User Story 4 — Collected & Delivered Status Indicators (Priority: P2)

**Goal**: The main order table row shows clearly distinguishable visual indicators for Încasată (payment collected) and Livrată (delivered) status — scannable at a glance without expanding the order.

**Independent Test**: Set Order A as Încasată=ON, Livrată=ON and Order B as both OFF — the table shows two distinct visual states for each order without any clicks required.

- [X] T018 [P] Add badge styles to `src/styles/order-list.css` — `.order-row-badge--collected` and `.order-row-badge--delivered` classes: active state uses a green/teal fill, inactive uses a grey/muted fill; include the label text ("Încasată" / "Livrată") and a small icon or checkmark for scannability
- [X] T019 Extend `src/components/OrderRow.js` — render two status badges in `.order-row-identity` or `.order-row-actions`: `<span className={order.collected ? 'order-row-badge--collected active' : 'order-row-badge--collected'}>Încasată</span>` and equivalent for `delivered`; these are display-only — editing is done via the modal toggles added in T009 (depends on T016)

**Checkpoint**: All four user stories are independently functional. Scanning the order list shows total, profit, and payment/delivery status per order without any interaction.

---

## Phase 7: Polish & Tests (Constitution-Required)

**Purpose**: Automated coverage required by constitution (80% floor for `src/lib/`, acceptance scenario gate for every user story).

- [X] T020 [P] Write unit tests in `tests/unit/lib/orders.test.js` — test `updateOrder` (valid fields, unknown fields, missing order), `parseRow` (new field mapping, boolean coercion, total as number), and `getAllWithStatus` returning `total: 0` for order with no products
- [X] T021 [P] Write E2E tests in `tests/e2e/order-fields.spec.js` — cover all six quickstart scenarios: (1) save/reload all order fields, (2) unit price × quantity = correct total, (3) total updates on price change, (4) empty-product total = 0, (5) custom contact platform via "Altele", (6) collected/delivered scan; run with `workers: 1` per project config
- [X] T022 Run full test suite to confirm all gates pass: `npm test -- --testPathPattern="orders"` (unit) and `npm run test:e2e -- --grep "order-fields"` (E2E); verify coverage ≥ 80% for `src/lib/orders.js` and `src/lib/products.js`

> **T022 results**: 122/122 unit + integration tests pass; `src/lib/` line coverage = 94.4% (gate: 80%). All 6 feature-006 E2E scenarios pass. The full E2E suite has 15 pre-existing failures in `add-items`, `adhoc-product`, `catalog-selector`, and `product-details` — these stem from stale tests (features 002–004) that no longer match the current `AddProductForm`/catalog markup. Verified by stashing all feature-006 changes and reproducing the identical 15 failures against the original code. **Not regressions from this feature.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **BLOCKS** all user story phases
- **US1 (Phase 3)**: Depends on Phase 2 completion (T002, T003, T004)
- **US2 (Phase 4)**: Depends on Phase 2 completion; T012 also depends on T009 (US1 modal structure)
- **US3 (Phase 5)**: Depends on T009 (modal wired to PATCH) and T014 (total in row)
- **US4 (Phase 6)**: Depends on T016 (OrderRow extended)
- **Polish (Phase 7)**: Depends on all story phases complete

### User Story Dependencies

| Story | Depends On | Can Parallelize With |
|-------|-----------|---------------------|
| US1 (Phase 3) | Phase 2 done | Nothing yet |
| US2 (Phase 4) | Phase 2 + T009 (US1 modal) | T010, T011, T013 are parallel within Phase 4 |
| US3 (Phase 5) | T009 (US1) + T014 (US2) | T015 is parallel |
| US4 (Phase 6) | T016 (US3) | T018 is parallel |

### Within Each User Story

- DB/library tasks before API tasks (T002 before T005, T004 before T010)
- API tasks before UI tasks (T005/T006 before T009, T010 before T012)
- CSS tasks [P] can be done alongside API tasks
- OrderRow.js changes sequential: T014 → T016 → T019 (same file)
- EditOrderModal.js changes sequential: T009 → T012 → T017 (same file)

### Parallel Opportunities

Within Phase 2:
```
T003 (orders.js)    ←── parallel ──→   T004 (products.js)
```

Within Phase 3:
```
T006 (api/orders/[id]/route.js)   ←── parallel ──→   T007 (api/orders/route.js)
T008 (product-modal.css)          ←── parallel ──→   T006, T007
T009 (EditOrderModal.js)          — sequential after T006, T008
```

Within Phase 4:
```
T010 (api/products/[id]/route.js)  ←── parallel ──→  T011 (product-modal.css)
T013 (order-list.css)              ←── parallel ──→  T010, T011
T012 (EditOrderModal.js)           — sequential after T009, T010, T011
T014 (OrderRow.js)                 — sequential after T013
```

Within Phase 7:
```
T020 (unit tests)   ←── parallel ──→   T021 (E2E tests)
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002–T004) — CRITICAL gate
3. Complete Phase 3: US1 (T005–T009) — all 10 order fields editable and persistent
4. Complete Phase 4: US2 (T010–T014) — unit prices and total calculation working
5. **STOP and VALIDATE**: Run quickstart Scenarios 1–4 manually
6. Optionally demo/deploy — core financial tracking is live

### Incremental Delivery

1. Foundation (T001–T004) → data layer ready
2. US1 (T005–T009) → order enrichment form ✓
3. US2 (T010–T014) → financial total ✓ (MVP deliverable)
4. US3 (T015–T017) → profit tracking ✓
5. US4 (T018–T019) → status badges ✓
6. Polish (T020–T022) → all tests green ✓

Each phase adds independent, demonstrable value without breaking prior phases.

---

## Notes

- All `[P]` tasks touch different files — no merge conflicts when run in parallel
- `EditOrderModal.js` and `OrderRow.js` changes are sequential within each file — do not parallelize tasks in the same file
- SQLite `ALTER TABLE` guards are idempotent — safe to re-run on every server start
- `collected`/`delivered` stored as INTEGER 0/1; always cast with `Boolean()` in JS layer
- Total is computed in SQL, not client-side, so `GET /api/orders` always returns the correct value
- `contactPlatform` "Altele" UX: `<select>` drives state; a conditional `<input type="text">` appears when value is "Altele"
- Constitution reminder: no mock DB in integration tests; use real SQLite file per `tests/` config
