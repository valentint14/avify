---
description: "Task list for feature: Order Filters"
---

# Tasks: Order Filters

**Input**: Design documents from `specs/007-order-filters/`

**Prerequisites**: [plan.md](plan.md) · [spec.md](spec.md) · [research.md](research.md) · [data-model.md](data-model.md) · [contracts/ui-components.md](contracts/ui-components.md)

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

## Phase 2: Foundational (Shared Filter Logic)

**Purpose**: Create the pure filter function and `DEFAULT_FILTERS` constant that every subsequent user story phase depends on. This is the only shared building block across all stories.

**⚠️ CRITICAL**: No user story implementation can begin until this phase is complete.

- [X] T002 Create `src/lib/orderFilters.js` — export `DEFAULT_FILTERS` constant `{ clientSearch: '', county: '', platform: '', collected: '', delivered: '' }` and a pure `filterOrders(orders, filters)` function implementing the AND logic from data-model.md: (1) clientSearch — case-insensitive partial match on `order.client` (null client excluded when search non-empty), (2) county — exact match on `order.county`, (3) platform — exact match on `order.contactPlatform`, (4) collected — boolean match `order.collected === (filters.collected === 'true')`, (5) delivered — boolean match `order.delivered === (filters.delivered === 'true')`; also export a `deriveOptions(orders, field)` helper that returns a sorted array of distinct non-null non-empty values for the given field

**Checkpoint**: `filterOrders(orders, DEFAULT_FILTERS)` called with a list of orders returns the full list unchanged; calling with specific filters returns the correct subset.

---

## Phase 3: User Story 1 — Client Name Text Search (Priority: P1) 🎯 MVP

**Goal**: A text search bar above the order table filters orders by client name instantly as the user types.

**Independent Test**: With orders bearing different client names, type a partial name in the search bar — only matching orders remain visible. Clearing the input restores all orders. Typing a non-matching string shows the empty-state message.

- [X] T003 [P] [US1] Create `src/styles/order-filters.css` — add `.order-filters` (flex row, `flex-wrap: wrap`, gap), `.order-filters__control` (flex column label+input wrapper), `.order-filters__label` (small uppercase label), `.order-filters__input` (text input styled consistently with existing app inputs)
- [X] T004 [US1] Create `src/components/OrderFilters.js` — stateless component that accepts props `{ filters, onChange, onReset, countyOptions, platformOptions }`; render the "Caută client" `<input type="text">` with a `<label htmlFor>` pair; import `../styles/order-filters.css`. **Deviation**: the planned 150 ms debounce was dropped — it required local mirror state that contradicted the "stateless" contract and caused a stale-input bug on reset. The input is now fully controlled by `filters.clientSearch`. See research.md Decision 3.
- [X] T005 [US1] Modify `src/components/OrderList.js` — import `{ filterOrders, DEFAULT_FILTERS, deriveOptions }` from `../lib/orderFilters.js` and `OrderFilters` from `./OrderFilters.js`; add `const [filterState, setFilterState] = useState(DEFAULT_FILTERS)`; add `function handleFilterChange(key, value) { setFilterState(prev => ({ ...prev, [key]: value })) }` and `function handleFilterReset() { setFilterState(DEFAULT_FILTERS) }`; derive `const filteredOrders = useMemo(() => filterOrders(orders, filterState), [orders, filterState])`; render `<OrderFilters filters={filterState} onChange={handleFilterChange} onReset={handleFilterReset} countyOptions={[]} platformOptions={[]} />` immediately below `<AddOrderForm>`; replace `orders.map(...)` with `filteredOrders.map(...)`; update the empty-state paragraph to show "Nu există comenzi. Adaugă prima comandă." when `orders.length === 0` and "Nicio comandă găsită pentru filtrele selectate." when `filteredOrders.length === 0` but `orders.length > 0`

**Checkpoint**: User Story 1 is independently testable — typing in the search bar filters the order list instantly; clearing restores all orders; empty search result shows the correct message.

---

## Phase 4: User Story 2 — County & Contact Platform Dropdowns (Priority: P2)

**Goal**: Two dropdown menus in the filter panel let users narrow orders by county and contact platform; options are dynamically derived from the loaded order data.

**Independent Test**: With orders spread across at least 2 counties, select a county from the dropdown — only orders for that county remain visible. Selecting "Toate județele" restores all orders. Same flow for platform.

- [X] T006 [P] [US2] Extend `src/styles/order-filters.css` — add `.order-filters__select` (styled `<select>`, consistent with app dropdown style); the `.order-filters__control` and `.order-filters__label` from T003 already cover the wrapper — no new wrappers needed
- [X] T007 [US2] Extend `src/components/OrderFilters.js` — add `countyOptions` and `platformOptions` prop consumption; render a "Județ" `<select>` with first option `<option value="">Toate județele</option>` followed by one `<option>` per `countyOptions` entry, calling `onChange('county', e.target.value)` on change; render a "Platformă contact" `<select>` equivalently using `platformOptions` and `onChange('platform', e.target.value)`; controlled via `value={filters.county}` and `value={filters.platform}`
- [X] T008 [US2] Extend `src/components/OrderList.js` — add `const countyOptions = useMemo(() => deriveOptions(orders, 'county'), [orders])` and `const platformOptions = useMemo(() => deriveOptions(orders, 'contactPlatform'), [orders])`; pass both as props to `<OrderFilters countyOptions={countyOptions} platformOptions={platformOptions} />`

**Checkpoint**: Selecting a county or platform in their respective dropdowns filters the order list; selecting "Toate" restores all orders; both filters work together (AND logic already in `filterOrders`).

---

## Phase 5: User Story 3 — Collection & Delivery Status Filters (Priority: P2)

**Goal**: Two tri-state `<select>` controls (Toate / Da / Nu) let users filter orders by their collection and delivery status.

**Independent Test**: With a mix of collected/uncollected orders, select "Încasată" — only collected orders appear. Select "Neîncasată" — only uncollected. Selecting "Toate" restores both. Same flow for Livrare.

- [X] T009 [US3] Extend `src/components/OrderFilters.js` — add an "Încasare" `<select>` with options `<option value="">Toate</option>`, `<option value="true">Încasată</option>`, `<option value="false">Neîncasată</option>` controlled via `value={filters.collected}` and calling `onChange('collected', e.target.value)`; add an equivalent "Livrare" `<select>` for `filters.delivered`; both reuse the existing `.order-filters__select` CSS class

**Checkpoint**: The collection and delivery status dropdowns filter the order list correctly; all four stories (US1–US3) interact via AND logic so combining any subset produces the correct intersection.

---

## Phase 6: User Story 4 — Combined Multi-Filter & Reset (Priority: P3)

**Goal**: A "Resetează filtrele" button resets all five filter dimensions to their defaults in a single click. The button is only visible when at least one filter is non-default.

**Independent Test**: Activate all 5 filters simultaneously, verify the intersection result, click "Resetează filtrele" — all filters clear and the full order list reappears.

- [X] T010 [P] [US4] Extend `src/styles/order-filters.css` — add `.order-filters__reset` (muted button style, e.g., secondary/ghost variant consistent with existing app button styles) and `.order-filters--active` modifier (optional subtle border or background on the `.order-filters` wrapper when filters are active)
- [X] T011 [US4] Extend `src/components/OrderFilters.js` — compute `const isActive = Object.values(filters).some(v => v !== '')` inside the component; render `{isActive && <button className="order-filters__reset" onClick={onReset}>Resetează filtrele</button>}`; optionally apply `order-filters--active` modifier to the container when `isActive` is true

**Checkpoint**: All four user stories are independently functional. A user can activate all 5 dimensions simultaneously, see the correct AND intersection, and clear everything with one click.

---

## Phase 7: Polish & Tests (Constitution-Required)

**Purpose**: Automated coverage required by constitution (80% floor for `src/lib/`, acceptance scenario gate for every user story).

- [X] T012 [P] Write unit tests in `tests/unit/lib/orderFilters.test.js` — test `filterOrders`: (a) `DEFAULT_FILTERS` returns all orders unchanged, (b) `clientSearch` case-insensitive partial match, (c) null client excluded when search non-empty, (d) exact county match, (e) exact platform match, (f) collected=true filter, (g) delivered=false filter, (h) combined AND of all five dimensions, (i) empty result when no orders match; test `deriveOptions`: sorted distinct non-null values, empty array when all values null
- [X] T013 [P] Write E2E tests in `tests/e2e/order-filters.spec.js` — cover all 6 quickstart scenarios: (1) client name search filters and clears correctly, (2) county dropdown filters and resets, (3) platform dropdown filters and resets, (4) collected status filter, (5) delivered status filter, (6) combined multi-filter + reset button; run with `workers: 1` per project config
- [X] T014 Run full test suite to confirm all gates pass: `npm test -- --testPathPattern="orderFilters"` (unit) and `npm run test:e2e -- --grep "order-filters"` (E2E); verify coverage ≥ 80% for `src/lib/orderFilters.js`

> **T014 results**: 138/138 unit + integration tests pass; `src/lib/orderFilters.js` coverage = 100% (gate: 80%); overall `src/lib/` line coverage = 95.58%. All 6 feature-007 E2E scenarios pass. Note: also updated `tests/unit/lib/orders.test.js` line 102 — the "bare order defaults" test now asserts `receptionDate` auto-fills with today's date, reflecting the feature-006 follow-up change committed in `3cb272a` (the test predated that behavior and was failing).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **BLOCKS** all user story phases
- **US1 (Phase 3)**: Depends on Phase 2 (T002)
- **US2 (Phase 4)**: Depends on Phase 3 complete (T005 wires OrderList — US2 builds on top of that)
- **US3 (Phase 5)**: Depends on Phase 3 complete (same reason — extends `OrderFilters.js` and `OrderList.js`)
- **US4 (Phase 6)**: Depends on Phases 3–5 complete (reset must cover all filter dimensions)
- **Polish (Phase 7)**: Depends on all story phases complete

### User Story Dependencies

| Story | Depends On | Can Parallelize With |
|-------|------------|---------------------|
| US1 (Phase 3) | Phase 2 done | T003 [P] with T004, T005 |
| US2 (Phase 4) | Phase 3 done | T006 [P] with T007, T008 |
| US3 (Phase 5) | Phase 3 done | T006 [P] from Phase 4 if running Phase 4 and 5 together |
| US4 (Phase 6) | Phases 3–5 done | T010 [P] with T011 |

### Within Each User Story

- CSS tasks [P] can be done alongside component or wiring tasks (different files)
- `OrderFilters.js` changes are sequential within each phase (same file: T004 → T007 → T009 → T011)
- `OrderList.js` changes are sequential within each phase (same file: T005 → T008)

### Parallel Opportunities

Within Phase 3:
```
T003 (order-filters.css)   ←── parallel ──→   T004 (OrderFilters.js)
T005 (OrderList.js)        — sequential after T003, T004
```

Within Phase 4:
```
T006 (order-filters.css)   ←── parallel ──→   T007 (OrderFilters.js)
T008 (OrderList.js)        — sequential after T006, T007
```

Within Phase 6:
```
T010 (order-filters.css)   ←── parallel ──→   T011 (OrderFilters.js)
```

Within Phase 7:
```
T012 (unit tests)   ←── parallel ──→   T013 (E2E tests)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002) — pure filter function
3. Complete Phase 3: US1 (T003–T005) — text search working end-to-end
4. **STOP and VALIDATE**: Search bar filters orders; empty state shows correctly
5. Optionally demo — basic find-by-name is already useful

### Incremental Delivery

1. Foundation (T001–T002) → filter logic ready
2. US1 (T003–T005) → client name search ✓ (MVP)
3. US2 (T006–T008) → county + platform dropdowns ✓
4. US3 (T009) → status filters ✓
5. US4 (T010–T011) → reset button ✓
6. Polish (T012–T014) → all tests green ✓

Each phase adds independent, demonstrable value without breaking prior phases.

---

## Notes

- No new npm dependencies — all React hooks used (`useState`, `useMemo`, `useRef`) are already in the project
- No API or DB changes — filtering is entirely client-side over data already in `OrderList.js` state
- `filterOrders` is a pure function in `src/lib/` — satisfies the constitution's 80% coverage floor without needing DOM or React in unit tests
- `DEFAULT_FILTERS` is the single source of truth for the reset action — updating it in one place keeps the reset handler trivial
- `deriveOptions` sorts options alphabetically so the dropdown is predictable regardless of insertion order
- Constitution reminder: no mock DB in integration tests; use real SQLite per `tests/` config
