# Tasks: Generează Listă Cumpărături (Shopping List Generator)

**Input**: Design documents from `specs/014-shopping-list-generator/`

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

- [x] T001 Create directories: `src/app/api/shopping-list/` and `tests/integration/shopping-list/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core aggregation function — must exist before any user story work can begin.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 Implement `getShoppingList()` with `SHOPPING_LIST_SQL` and `EXCLUDED_COUNT_SQL` queries in `src/lib/shoppingList.js` — compute `today` and `cutoff` as `YYYY-MM-DD` strings, run both prepared statements with `{ today, cutoff }` named-parameter object, return `{ rows: [{ materialId, materialName, unit, totalRequired, currentStock, toBuy: Math.max(0, ...) }], excludedCount, generatedAt }` — see [plan.md](plan.md#implementation-notes) for exact SQL and function body

- [x] T003 [P] Write Jest integration tests for `getShoppingList()` covering the following cases in `tests/integration/shopping-list/shoppingList.test.js`:
  - Empty DB returns `{ rows: [], excludedCount: 0, generatedAt: <string> }`
  - Order with `event_date` > today+30 (outside window) is excluded
  - Order with `event_date` = today (in window), product with template + recipe → correct `totalRequired` and `toBuy`
  - Order with only `delivery_date` in window → included
  - Order with either date in window → included (OR logic)
  - Two orders same template same material → quantities summed into one row
  - Two materials from same template → two rows, sorted by name ASC
  - Ad-hoc product (`template_id = NULL`) → `excludedCount = 1`, not in `rows`
  - Template product with no recipe lines → `excludedCount = 1`, not in `rows`
  - Product with `status = 'realizat'` in qualifying order → excluded, not counted
  - `currentStock >= totalRequired` → `toBuy = 0`
  - `qty_per_piece = 0` on recipe line → excluded by `AND rl.qty_per_piece > 0`
  - Use the `:memory:` mock pattern: `jest.mock('../../../src/lib/db.js', () => { const { openDb } = jest.requireActual('../../../src/lib/db.js'); const testDb = openDb(':memory:'); return { getDb: () => testDb, openDb }; });`
  - Insert test orders with dates relative to `Date.now()` (e.g., `new Date(Date.now() + 1 * 86400000).toISOString().slice(0, 10)` for tomorrow) so tests remain date-independent

**Checkpoint**: `getShoppingList()` passes all integration tests. Ready for user story implementation.

---

## Phase 3: User Story 1 — Generate and View Shopping List (Priority: P1) 🎯 MVP

**Goal**: Workshop manager clicks "Generează listă cumpărături" on the "Stoc materiale" page, sees a modal with the correct material quantities to purchase for orders due in the next 30 days.

**Independent Test**: Seed two orders (event_date within 30 days) with products from a template that has a known recipe; seed a material with known stock; click the button; verify the modal shows the correct `toBuy` quantity. Also verify the "no orders" message appears when no orders are in range. See [quickstart.md](quickstart.md) Scenarios 1, 2, 3.

### Tests (write before implementation — should FAIL until implementation is complete)

- [x] T004 [P] [US1] Write Playwright E2E tests for US1 Scenarios 1, 3, 4, 5 in `tests/e2e/shopping-list.spec.js`:
  - **Scenario 1** (happy path): seed orders + material + recipe → click `[data-testid="generate-shopping-list-btn"]` → assert `[data-testid="shopping-list-modal"]` visible → assert `[data-testid="shopping-list-row"]` exists with correct material name
  - **Scenario 3** (no orders): ensure no in-window orders → click button → assert `[data-testid="no-orders-message"]` visible
  - **Scenario 4** (excluded warning): add ad-hoc product to in-window order → click button → assert `[data-testid="excluded-warning"]` visible with count > 0
  - **Scenario 5** (all covered): material stock > required → click button → assert `[data-testid="all-covered-message"]` visible (or `toBuy` rows all show 0)
  - Use `workers: 1` and shared SQLite DB (same pattern as `tests/e2e/mod-productie.spec.js`)

### Implementation

- [x] T005 [P] [US1] Create `src/app/api/shopping-list/route.js`: `export const dynamic = 'force-dynamic'`; `export async function GET()` that calls `getShoppingList()` and returns `Response.json(result)` with a 500 fallback — see [contracts/api-contracts.md](contracts/api-contracts.md) for exact response shape

- [x] T006 [US1] Create `src/components/ShoppingListModal.js` as a `'use client'` component: accepts `open` (boolean) and `onClose` (() => void) props; renders shadcn `<Dialog open={open} onOpenChange={onClose}>`; `useEffect([open])` fetches `/api/shopping-list` when `open` becomes `true`, sets `{ loading, error, result }` state; renders:
  - Loading state: spinner/skeleton with text "Se calculează lista..." and `data-testid="shopping-list-loading"`
  - Error state: "Eroare la generarea listei." text + "Reîncearcă" button that re-fetches
  - Empty state (no orders): paragraph with `data-testid="no-orders-message"` showing "Nu există comenzi cu termen în următoarele 30 de zile."
  - Result state: split `result.rows` into `toBuyRows` (toBuy > 0) and `coveredRows` (toBuy === 0); render `toBuyRows` as primary table/list with `data-testid="shopping-list-row"` on each row showing material name, total required, current stock, and to-buy quantity (all with unit); render `coveredRows` in a secondary de-emphasised section; if all `toBuy === 0` show `data-testid="all-covered-message"` with "Stocul existent acoperă toată producția planificată."
  - Excluded warning: when `result.excludedCount > 0`, render `data-testid="excluded-warning"` with "X produs(e) fără rețetă nu au putut fi calculate."
  - DialogFooter with a "Închide" button (no print button yet — added in US2)
  - Use `data-testid="shopping-list-modal"` on `DialogContent`
  - See [contracts/api-contracts.md](contracts/api-contracts.md) for the full content structure and all required `data-testid` attributes

- [x] T007 [US1] Extend `src/components/MaterialsPage.js`: add `const [showShoppingList, setShowShoppingList] = useState(false)`; import `ShoppingListModal`; restructure the page header `<div>` to use `flex items-start justify-between gap-4` with the title+description on the left and a shadcn `<Button>` with label "Generează listă cumpărături" and `data-testid="generate-shopping-list-btn"` on the right; render `<ShoppingListModal open={showShoppingList} onClose={() => setShowShoppingList(false)} />` immediately after the header `<div>`

**Checkpoint**: Navigate to `/stoc-materiale` — "Generează listă cumpărături" button is visible in top-right; clicking it opens the modal; modal fetches and displays shopping list or empty-state message; Playwright US1 tests pass.

---

## Phase 4: User Story 2 — Print the Shopping List (Priority: P2)

**Goal**: A "Printează lista" button in the modal opens the browser print dialog with a clean view — only material name, quantity to buy, and unit, plus a generation date header.

**Independent Test**: Generate a list with at least one "to buy" item; click "Printează lista"; verify the browser print dialog opens; in DevTools `@media print` simulation confirm buttons and overlay are hidden. See [quickstart.md](quickstart.md) Scenario 6.

### Tests (write before implementation — should FAIL until implementation is complete)

- [x] T008 [P] [US2] Add Playwright E2E test for US2 Scenario 6 to `tests/e2e/shopping-list.spec.js`:
  - Open modal with shopping list result → assert `[data-testid="print-button"]` is visible
  - Spy on `window.print` using `page.evaluate(() => { window._printCalled = false; window.print = () => { window._printCalled = true; }; })` before clicking
  - Click the print button → assert `await page.evaluate(() => window._printCalled)` is `true`
  - Verify the print button has the `print:hidden` class (confirming it won't appear in the printed output)

### Implementation

- [x] T009 [US2] Extend `src/components/ShoppingListModal.js`:
  - Add a generation date header line inside the result state: `<p className="text-xs text-muted-foreground print:text-black">Generat la {new Date(result.generatedAt).toLocaleString('ro-RO')}</p>`
  - Add "Printează lista" button in the DialogFooter with `data-testid="print-button"`, `onClick={() => window.print()}`, and `className="print:hidden"` (hidden in print output)
  - Add `className="print:hidden"` to the existing "Închide" button in DialogFooter
  - Add `className="print:hidden"` to the Dialog close icon button (the `×` rendered by shadcn's DialogContent)
  - For the DialogOverlay: wrap it or pass `className="print:hidden"` to suppress the dark backdrop in print — if the shadcn `Dialog` component doesn't expose `overlayClassName`, add a global `@media print { [data-radix-dialog-overlay] { display: none !important; } }` rule to `src/app/globals.css` as a fallback

**Checkpoint**: "Printează lista" button visible in loaded modal; clicking it calls `window.print()`; US2 Playwright test passes; `print:hidden` applied to all UI chrome.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Viewport compliance, number formatting, and full validation.

- [x] T010 [P] Verify tablet viewport (768px wide): open `/stoc-materiale` in DevTools at 768×1024, click "Generează listă cumpărături", confirm modal opens without horizontal overflow and material rows don't truncate — fix any overflow or wrapping issues in `src/components/ShoppingListModal.js`

- [x] T011 Run all 7 validation scenarios from [quickstart.md](quickstart.md) against `npm run dev` and confirm each expected outcome passes; document any discrepancies

- [x] T012 [P] Verify Jest integration test coverage for `src/lib/shoppingList.js` meets ≥80% line threshold — run `npm test -- --coverage --testPathPattern=shopping-list` and check report; add tests if below threshold

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3 (US1)**: Depends on Phase 2 — first user story, creates all new files
- **Phase 4 (US2)**: Depends on Phase 3 — extends `ShoppingListModal.js` built in US1
- **Phase 5 (Polish)**: Depends on all user story phases

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational only — no story dependencies
- **US2 (P2)**: Depends on US1 (`ShoppingListModal.js` must exist) — extends, doesn't replace

### Within Each Phase

- T002 before T003 within Phase 2 (can overlap — T003 reads T002 output)
- T004 (test) before T005/T006/T007 (implementation) within Phase 3
- T004/T005 can run in parallel with each other (different files)
- T006 before T007 (T007 imports ShoppingListModal from T006)
- T008 (test) before T009 (implementation) within Phase 4

---

## Parallel Opportunities

**Phase 2 — can overlap after T001**:
```
T002  src/lib/shoppingList.js
T003  tests/integration/shopping-list/shoppingList.test.js  [P with T002]
```

**Phase 3 — can run in parallel after Phase 2**:
```
T004  tests/e2e/shopping-list.spec.js (US1 scenarios)
T005  src/app/api/shopping-list/route.js
```
Then sequentially:
```
T006  src/components/ShoppingListModal.js          (needs T005 to exist as API target)
T007  src/components/MaterialsPage.js              (needs T006 to exist as import)
```

**Phase 4 — after Phase 3**:
```
T008  tests/e2e/shopping-list.spec.js (US2 scenario)  [P]
```
Then:
```
T009  src/components/ShoppingListModal.js (print extension)
```

**Phase 5 — can run in parallel after all stories**:
```
T010  viewport check
T012  coverage check
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) → Phase 2 (Foundational) → Phase 3 (US1)
2. **STOP and VALIDATE**: `/stoc-materiale` shows the button; modal displays correct list; Playwright US1 scenarios pass
3. Feature is usable: manager can generate and review the shopping list

### Incremental Delivery

1. Setup + Foundational → foundation ready (Checkpoint: `getShoppingList()` integration tests pass)
2. + US1 → shopping list visible in modal (Checkpoint: Scenarios 1, 3, 4, 5 pass) → **DEMO / SHIP MVP**
3. + US2 → print button functional (Checkpoint: Scenario 6 passes)
4. + Polish → all 7 Scenarios pass

---

## Notes

- `[P]` tasks write to different files and have no blocking inter-dependencies
- Constitution requires ≥80% unit test coverage for new code in `src/lib/`
- `getShoppingList()` uses synchronous `node:sqlite` DatabaseSync — do not introduce `async`/`await` in the lib layer
- No new npm packages — shadcn `Dialog` and Lucide icons are already installed
- The `ShoppingListModal.js` fetch is async (client-side `fetch()`) — this is correct; only the lib layer must stay synchronous
- `data-testid` attributes in `ShoppingListModal.js` are required for Playwright tests — do not rename them
