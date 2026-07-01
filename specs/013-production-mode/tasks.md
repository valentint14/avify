# Tasks: Mod producție (Production Mode)

**Input**: Design documents from `specs/013-production-mode/`

**Prerequisites**: [plan.md](plan.md) · [spec.md](spec.md) · [research.md](research.md) · [data-model.md](data-model.md) · [contracts/api-contracts.md](contracts/api-contracts.md) · [quickstart.md](quickstart.md)

**Tests**: Included per constitution requirements (every user story needs passing acceptance scenarios).

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to
- Exact file paths included in every task description

---

## Phase 1: Setup

**Purpose**: Create directory structure so all file-write tasks have valid destinations.

- [x] T001 Create directories: `src/app/mod-productie/`, `src/app/api/mod-productie/`, `tests/integration/mod-productie/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core aggregation function and navigation entry — both must exist before any user story work can begin.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 Implement `getProductionQueue()` with the `PRODUCTION_QUEUE_SQL` aggregation query (GROUP BY template/name, SUM quantity, `json_group_array` for contributing orders) in `src/lib/productionQueue.js` — see [data-model.md](data-model.md) for full SQL and [plan.md](plan.md#implementation-notes) for the complete function body
- [x] T003 [P] Write Jest integration tests for `getProductionQueue()` covering: empty DB returns `[]`; single template product groups correctly; two orders same template sums quantities; two different templates produces two groups sorted desc; ad-hoc product (null template_id) groups by product name — in `tests/integration/mod-productie/productionQueue.test.js`
- [x] T004 [P] Add `{ label: 'Mod producție', href: '/mod-productie' }` between Calendar and Statistici entries in `src/lib/navigation.js`

**Checkpoint**: `getProductionQueue()` passes integration tests; "Mod producție" appears in navbar (page 404 until Phase 3 complete).

---

## Phase 3: User Story 1 — View Aggregated Production Queue (Priority: P1) 🎯 MVP

**Goal**: Workshop manager navigates to `/mod-productie` and sees all `'de_realizat'` products grouped by template (or product name), with total quantity per group, sorted highest-first.

**Independent Test**: Create two orders containing the same product template at different quantities; navigate to `/mod-productie`; verify the quantities are summed into a single group row at the top of the list (see [quickstart.md](quickstart.md) Scenario 1).

### Tests (write before implementation — should FAIL until implementation is complete)

- [x] T005 [P] [US1] Write Playwright E2E test for US1 Scenario 1 (aggregated queue display, quantity sums, sorted order) and Scenario 3 (empty state) in `tests/e2e/mod-productie.spec.js`

### Implementation

- [x] T006 [P] [US1] Create `src/app/api/mod-productie/route.js`: `export async function GET()` that calls `getProductionQueue()` and returns `{ groups, fetchedAt: new Date().toISOString() }` — 500 on error; see [contracts/api-contracts.md](contracts/api-contracts.md) for exact response shape
- [x] T007 [P] [US1] Create `src/components/skeletons/ProductionQueueSkeleton.js`: renders 4 `animate-pulse` rows (full-width header bar + two narrower sub-bars each), using the same Tailwind skeleton tokens as `DashboardSkeleton.js`
- [x] T008 [US1] Create `src/components/ProductionQueue.js` as a `'use client'` component: accepts `initialGroups` and `initialFetchedAt` props; renders a sorted list of group rows, each showing `group.label` and `group.totalQuantity` (formatted with `toLocaleString('ro-RO')`); includes empty state "Nicio comandă nu are produse de realizat." when `groups.length === 0`; includes error state with `role="alert"` and "Reîncearcă" button (stub — wired in US3) — see [contracts/api-contracts.md](contracts/api-contracts.md) for the full UI contract
- [x] T009 [US1] Create `src/app/mod-productie/page.js`: `export const dynamic = 'force-dynamic'`; `export const metadata = { title: 'Mod producție — Avify' }`; wraps `<ProductionQueueData>` async inner function in `<Suspense fallback={<ProductionQueueSkeleton />}>`; inner function calls `getProductionQueue()` after `await new Promise(setImmediate)` and renders `<ProductionQueue initialGroups={groups} initialFetchedAt={fetchedAt} />`

**Checkpoint**: Navigate to `/mod-productie` — page loads, groups display with correct totals, empty state shows when no `'de_realizat'` products exist, Playwright Scenario 1 and Scenario 3 pass.

---

## Phase 4: User Story 2 — Drill Down Into a Production Group (Priority: P2)

**Goal**: Clicking a group row expands it to show a sub-list of contributing orders with their individual quantities; clicking again collapses it; the sum of per-order quantities equals the group total.

**Independent Test**: Click any group row; verify the sub-list appears listing each contributing order name, client, and quantity; verify quantity sum equals the group total header; click again to collapse (see [quickstart.md](quickstart.md) Scenario 2).

### Tests (write before implementation — should FAIL until implementation is complete)

- [x] T010 [US2] Add Playwright E2E test for US2 Scenario 2 (expand/collapse, contributing orders list, quantity sum equals group total) to `tests/e2e/mod-productie.spec.js`

### Implementation

- [x] T011 [US2] Extend `src/components/ProductionQueue.js`: add `expandedKeys` state (`useState(new Set())`); each group row is a `<button>` with `aria-expanded={expandedKeys.has(group.key)}` and `aria-controls={group.key + '-orders'}` that toggles the key in `expandedKeys`; when expanded, render a sub-list (`role="list"`, `id={group.key + '-orders'}`) with one `<li>` per contributing order showing `order.orderName`, `order.client ?? '—'`, and `order.quantity` — see [contracts/api-contracts.md](contracts/api-contracts.md) for the full UI contract

**Checkpoint**: Group rows expand and collapse on click; sub-lists show correct per-order quantities; Playwright Scenario 2 passes.

---

## Phase 5: User Story 3 — Refresh Production Queue on Demand (Priority: P3)

**Goal**: A visible refresh button re-fetches the production queue from the API without a full page navigation; a "last updated" timestamp updates on every successful fetch; the button shows a loading indicator during the request; errors show a retry option.

**Independent Test**: Open the page in Tab A; create a new order with a new product in Tab B; click the refresh button in Tab A; verify the new product group appears; verify the timestamp updates (see [quickstart.md](quickstart.md) Scenario 4).

### Tests (write before implementation — should FAIL until implementation is complete)

- [x] T012 [US3] Add Playwright E2E test for US3 Scenario 4 (refresh fetches new data, timestamp updates) to `tests/e2e/mod-productie.spec.js`

### Implementation

- [x] T013 [US3] Extend `src/components/ProductionQueue.js`: add `loading` and `error` state; add `handleRefresh` async function that `fetch('/api/mod-productie')` and updates `groups`, `fetchedAt`, and `error`; add a refresh `<button>` with `aria-label="Reîncarcă coada de producție"` rendering a `<RefreshCw>` Lucide icon (spinning via CSS class when `loading` is true), disabled during `loading`; wire the "Reîncearcă" button in the error state to also call `handleRefresh`; display `fetchedAt` formatted with `new Date(fetchedAt).toLocaleTimeString('ro-RO')` as "Actualizat la HH:MM:SS"

**Checkpoint**: Refresh button updates data without page reload; timestamp reflects new fetch time; error state shows retry button; Playwright Scenario 4 passes.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Tablet viewport compliance, number formatting, and full validation.

- [x] T014 [P] Verify tablet viewport (768px wide): open `/mod-productie` in DevTools at 768×1024 and confirm no horizontal scrollbar, group labels do not overflow, navbar collapses to hamburger — fix any overflow or truncation issues in `src/components/ProductionQueue.js` (see [quickstart.md](quickstart.md) Scenario 6)
- [x] T015 Run all 6 validation scenarios from [quickstart.md](quickstart.md) against the running app (`npm run dev`) and confirm each expected outcome passes
- [x] T016 [P] Verify Jest integration test coverage for `src/lib/productionQueue.js` meets ≥80% line threshold — run `npm test -- --coverage` and check report

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3 (US1)**: Depends on Phase 2 — first user story, creates the base component
- **Phase 4 (US2)**: Depends on Phase 3 — extends `ProductionQueue.js` built in US1
- **Phase 5 (US3)**: Depends on Phase 3 — extends `ProductionQueue.js` built in US1 (can run in parallel with US2 if on different branches, but targets the same file)
- **Phase 6 (Polish)**: Depends on all user story phases

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational only — no story dependencies
- **US2 (P2)**: Depends on US1 (`ProductionQueue.js` must exist) — extends, doesn't replace
- **US3 (P3)**: Depends on US1 (`ProductionQueue.js` must exist) — extends, doesn't replace; US2 and US3 can run in parallel if managed carefully (same file)

### Within Each Phase

- Tests first, then implementation
- T005/T006/T007 within Phase 3 can start in parallel (different files); T008 waits for T006 to exist as a reference; T009 waits for T007 and T008
- T010 (test) in Phase 4 before T011 (implementation)
- T012 (test) in Phase 5 before T013 (implementation)

---

## Parallel Opportunities

**Phase 2 — can run in parallel after T001**:
```
T002  src/lib/productionQueue.js
T003  tests/integration/mod-productie/productionQueue.test.js
T004  src/lib/navigation.js
```

**Phase 3 — can run in parallel after Phase 2**:
```
T005  tests/e2e/mod-productie.spec.js (US1 scenarios)
T006  src/app/api/mod-productie/route.js
T007  src/components/skeletons/ProductionQueueSkeleton.js
```

**Phase 6 — can run in parallel after all stories**:
```
T014  viewport check
T016  coverage check
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) → Phase 2 (Foundational) → Phase 3 (US1)
2. **STOP and VALIDATE**: `/mod-productie` shows aggregated queue, Playwright Scenario 1 + 3 pass
3. Production is usable: manager sees what to produce and how much

### Incremental Delivery

1. Setup + Foundational → foundation ready (Checkpoint: navbar link visible)
2. + US1 → aggregated list visible (Checkpoint: Scenarios 1 & 3 pass) → **DEMO / SHIP MVP**
3. + US2 → drill-down working (Checkpoint: Scenario 2 passes)
4. + US3 → refresh working (Checkpoint: Scenario 4 passes)
5. + Polish → all 6 Scenarios pass

---

## Notes

- `[P]` tasks write to different files and have no blocking inter-dependencies
- Constitution requires ≥80% unit test coverage for new code in `src/lib/`
- `getProductionQueue()` uses synchronous `node:sqlite` DatabaseSync — do not introduce `async`/`await` in the lib layer
- No new npm packages — `RefreshCw` and `ChevronDown` are already in `lucide-react`; `Collapsible` from `@radix-ui/react-collapsible` is available via shadcn/ui if needed, but `useState` toggle is sufficient per plan decisions
