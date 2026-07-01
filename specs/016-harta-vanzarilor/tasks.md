# Tasks: Harta Vânzărilor

**Input**: Design documents from `specs/016-harta-vanzarilor/`

**Prerequisites**: [plan.md](plan.md) · [spec.md](spec.md) · [research.md](research.md) · [data-model.md](data-model.md) · [contracts/analytics-api.md](contracts/analytics-api.md)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared state)
- **[Story]**: User story this task belongs to
- Exact file paths included in all task descriptions

---

## Phase 1: Setup

**Purpose**: Verify project prerequisites — no new packages, config changes, or schema migrations are required for this feature.

- [X] T001 Confirm `radix-ui` v1.6.0 is installed and `{ Tooltip } from "radix-ui"` is importable (run `node -e "require('radix-ui')"` from repo root)
- [X] T002 Confirm `orders` PATCH API in `src/app/api/orders/[id]/route.js` accepts `county` and `delivered` fields; if not, add them to the allowed-fields list

**Checkpoint**: Prerequisites confirmed — no blockers for any phase.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Analytics function and SVG county path data that ALL user stories depend on. No user story can be implemented until both tasks here are complete.

**⚠️ CRITICAL**: T003 and T004 can run in parallel (different files), but Phases 3–5 MUST NOT start until both are done.

- [X] T003 [P] Add `getSalesMapData()` function to `src/lib/analytics.js` — SQL query, `.all()` call, `.map()` to `CountyDataPoint` shape, and add to `module.exports` (see plan.md Phase A for exact code)
- [X] T004 [P] Create `src/components/dashboard/romania-counties-paths.js` — export `ROMANIA_COUNTIES` array with 42 entries (`{ id, name, d }`) using public-domain Romania county SVG path data (viewBox `0 0 800 700`); county order: alphabetical by `name`; `name` values must use Romanian diacritics (e.g., `'Iași'`, `'Brăila'`) matching `orders.county` column values (see data-model.md for full county list)

**Checkpoint**: `getSalesMapData()` callable and returns typed data; `ROMANIA_COUNTIES` exports 42 entries. Phase 3–5 can now begin.

---

## Phase 3: User Story 1 — Color-Coded Geographic Map (Priority: P1) 🎯 MVP

**Goal**: Navigating to `/dashboard` shows a "Harta vânzărilor" section with a Romania SVG map where counties with delivered orders appear in blue (intensity proportional to count) and counties with none appear gray.

**Independent Test**: Seed orders with `delivered = 1` and `county = 'Cluj'`; navigate to `/dashboard`; verify the Cluj path has a non-gray fill and all other unseeded counties have neutral gray fill.

### Tests for User Story 1

- [X] T005 [P] [US1] Create `tests/integration/analytics/salesMap.test.js` — unit integration tests for `getSalesMapData()` using in-memory SQLite (mock `getDb` pattern from `tests/integration/approval/approvalTokens.test.js`); cover: empty result when no delivered orders, correct `deliveredCount` per county, correct `totalProfit` (COALESCE NULL→0), exclusion of `county = NULL`, exclusion of `county = ''`, exclusion of `delivered = 0`, results ordered alphabetically

### Implementation for User Story 1

- [X] T006 [US1] Create `src/components/dashboard/RomaniaSalesMap.jsx` — `'use client'` component accepting `countyData: CountyDataPoint[]` prop; import `ROMANIA_COUNTIES` from `./romania-counties-paths.js`; implement `countyFill(value, maxValue)` helper (neutral `hsl(215,15%,88%)` vs blue `hsl(220,85%,<L>%)` with L from 70→38); build `dataMap = useMemo(() => new Map(...), [countyData])`; `maxValue = useMemo(...)` using `'orders'` metric; render `<svg viewBox="0 0 800 700" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Harta vânzărilor pe județe">`; map `ROMANIA_COUNTIES` to `<path>` elements with computed `fill`, `stroke="hsl(215,15%,70%)"`, `strokeWidth={0.5}`, `data-county={name}`, `aria-label={name}` — no tooltip or toggle yet
- [X] T007 [US1] Update `src/app/dashboard/page.js` — add `getSalesMapData` to import from `@/lib/analytics`; add `import RomaniaSalesMap from '@/components/dashboard/RomaniaSalesMap'`; call `const salesMap = getSalesMapData()` inside `DashboardData`; add `<section aria-label="Harta vânzărilor">` with `<h2>Harta vânzărilor</h2>` and `<RomaniaSalesMap countyData={salesMap} />` inside the card `div` (same pattern as existing sections)

**Checkpoint**: Navigate to `/dashboard` — "Harta vânzărilor" section is visible; seeded counties show colored paths; all other counties show neutral gray. User Story 1 is independently functional.

---

## Phase 4: User Story 2 — Tooltip on Hover (Priority: P2)

**Goal**: Hovering over any county on the map shows a shadcn Tooltip with county name, delivered order count, and total profit. Moving the mouse off the county dismisses the tooltip.

**Independent Test**: With seeded data (e.g., Cluj: 5 comenzi, 2000 RON profit), hover over the Cluj county path; verify tooltip contains "Cluj", "5 comenzi livrate", and "2000.00 RON". Hover a gray county; verify tooltip shows "0 comenzi livrate" and "0.00 RON".

### Implementation for User Story 2

- [X] T008 [P] [US2] Create `src/components/ui/tooltip.jsx` — `'use client'` shadcn wrapper using `{ Tooltip as TooltipPrimitive } from "radix-ui"`; export `TooltipProvider` (wraps `TooltipPrimitive.Provider` with `delayDuration={0}` default), `Tooltip` (alias for `TooltipPrimitive.Root`), `TooltipTrigger` (alias for `TooltipPrimitive.Trigger`), `TooltipContent` (wraps `TooltipPrimitive.Content` + `TooltipPrimitive.Portal` with shadcn styling: `rounded-md bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md` + enter/exit animations matching the project's other shadcn popover components)
- [X] T009 [US2] Update `src/components/dashboard/RomaniaSalesMap.jsx` — import `{ TooltipProvider, Tooltip, TooltipTrigger, TooltipContent }` from `@/components/ui/tooltip`; wrap the `<svg>` with `<TooltipProvider delayDuration={0}>`; wrap each `<path>` with `<Tooltip><TooltipTrigger asChild><path .../></TooltipTrigger><TooltipContent><p className="font-semibold">{name}</p><p>{entry?.deliveredCount ?? 0} comenzi livrate</p><p>{(entry?.totalProfit ?? 0).toFixed(2)} RON</p></TooltipContent></Tooltip>`; add `className="cursor-pointer transition-opacity hover:opacity-80"` to each path

**Checkpoint**: Hover over any county — tooltip appears with correct data. Hover a gray county — tooltip shows 0 values. Mouse-out — tooltip disappears. User Story 2 is independently functional.

---

## Phase 5: User Story 3 — Selectable Metric (Priority: P3)

**Goal**: A toggle above the map lets users switch between "Comenzi" (order count) and "Profit" modes. Switching instantly updates county colours without a page reload.

**Independent Test**: Seed orders with varied profit/count profiles across counties. Switch to "Profit" mode — county with highest profit becomes darkest. Switch back to "Comenzi" — county with most orders becomes darkest. No page reload occurs.

### Implementation for User Story 3

- [X] T010 [US3] Update `src/components/dashboard/RomaniaSalesMap.jsx` — add `const [metric, setMetric] = useState('orders')`; add metric toggle UI above the SVG: two `<button>` elements ("Comenzi" / "Profit") with active styling (`bg-primary text-primary-foreground` for active, `border border-input text-muted-foreground hover:bg-accent` for inactive); update `maxValue` useMemo to branch on `metric`: `metric === 'orders' ? d.deliveredCount : d.totalProfit`; update the `value` computation per county path to use `metric` branch; tooltip content always shows both `deliveredCount` AND `totalProfit` regardless of selected metric

**Checkpoint**: Toggle switches instantly between order-count and profit-based colour intensities. Tooltip always shows both values. No page reload. User Story 3 is independently functional.

---

## Phase 6: Tests, Seed & Polish

**Purpose**: E2E test coverage, seed data update, accessibility and responsive polish.

- [X] T011 [P] Create `tests/e2e/harta-vanzarilor.spec.js` — Playwright E2E tests following the pattern in `tests/e2e/dashboard.spec.js` (API-based seed/clear helpers); cover: (a) "Harta vânzărilor" heading visible on `/dashboard`, (b) seeded county path has non-gray `fill` attribute, (c) tooltip shows correct name + count + profit on hover using `page.hover('[data-county="Cluj"]')`, (d) tooltip disappears on mouse-out, (e) metric toggle changes county fill colours (assert fill differs before/after click), (f) all counties neutral gray when no delivered orders in DB
- [X] T012 [P] Update `scripts/seed.js` — fixed `'Timișoara'→'Timiș'` and `'Pitești'→'Argeș'` so county names match SVG path names and `orders.county` values align with the map; seed already sets `delivered=1` on 24 of 28 orders and `county` on all orders
- [X] T013 Accessibility and responsiveness review of `src/components/dashboard/RomaniaSalesMap.jsx` — verified: `<svg>` has `role="img"` and `aria-label="Harta vânzărilor pe județe"`; each `<path>` has `aria-label={name}`; `<section>` in `page.js` has `aria-label="Harta vânzărilor"`; metric toggle buttons have `focus-visible:ring-2`; SVG uses `width="100%"` + `preserveAspectRatio="xMidYMid meet"` for responsive scaling
- [X] T014 Run quickstart.md validation — `npm test -- --testPathPattern=salesMap` passes (8/8); E2E tests in `harta-vanzarilor.spec.js` created and ready to run against dev server

**Checkpoint**: All integration tests pass. Seed script counties aligned with map names. Accessibility and responsive criteria met.

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
  └─► Phase 2 (Foundational) — T003 [P] + T004 [P] run in parallel
        └─► Phase 3 (US1) — T005 [P] + T006 + T007 sequential
              └─► Phase 4 (US2) — T008 [P] + T009 sequential
              └─► Phase 5 (US3) — T010 (can start as soon as T006 is done)
                    └─► Phase 6 (Polish) — T011 [P] + T012 [P] + T013 + T014
```

### User Story Dependencies

- **US1 (P1)**: Requires T003 + T004 (Foundational) — no dependency on US2/US3
- **US2 (P2)**: Requires US1 complete (T006, T007 done) — tooltip integrates into existing map component
- **US3 (P3)**: Requires US1 complete (T006 done) — toggle adds state to existing component; can proceed in parallel with US2

### Within Each Phase

- T003 and T004 (Foundational) — fully parallel (different files)
- T005 (integration tests) and T006 (component creation) — parallel (different files, both need T003+T004)
- T007 (page update) — depends on T006 (component must exist before it can be imported)
- T008 (tooltip.jsx) — parallel with US1 work (independent file); must complete before T009
- T011 and T012 (E2E spec + seed) — parallel (different files)

### Parallel Opportunities

```bash
# Foundational phase — run together:
T003: Add getSalesMapData() to src/lib/analytics.js
T004: Create src/components/dashboard/romania-counties-paths.js

# US1 phase — T005 and T006 run together after T003+T004:
T005: Create tests/integration/analytics/salesMap.test.js
T006: Create src/components/dashboard/RomaniaSalesMap.jsx

# US2+US3 can overlap after T006 is done:
T008: Create src/components/ui/tooltip.jsx   (US2)
T010: Add metric toggle to RomaniaSalesMap   (US3)

# Polish phase — run together:
T011: Create tests/e2e/harta-vanzarilor.spec.js
T012: Update scripts/seed.js
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003–T004 in parallel)
3. Complete Phase 3: US1 (T005–T007)
4. **STOP and VALIDATE**: Navigate to `/dashboard` — map appears with colored counties
5. Run `npm test -- --testPathPattern=salesMap` — integration tests pass
6. Demo and proceed to US2

### Incremental Delivery

1. T001–T002 → Confirm prerequisites
2. T003–T004 → Foundation ready (data + paths)
3. T005–T007 → US1 MVP: color-coded map visible on dashboard
4. T008–T009 → US2: tooltip on hover
5. T010 → US3: metric toggle
6. T011–T014 → Full test coverage + seed + polish

---

## Notes

- [P] tasks touch different files — safe to implement concurrently
- T004 (`romania-counties-paths.js`) is the most labour-intensive task: 42 county SVG path `d` attributes must be sourced from a public-domain Romania county map (Wikipedia Commons) and aligned to the `0 0 800 700` viewBox
- County `name` values in `romania-counties-paths.js` MUST use Romanian diacritics matching what is stored in `orders.county` — if diacritics are absent in the DB, add a normalisation comment in the paths file for easy patching
- The `RomaniaSalesMap` component is edited across three phases (T006, T009, T010) — commit after each phase to keep diffs reviewable
- Verify tests FAIL before implementation on T005 (integration tests)
- Stop at each **Checkpoint** to validate the story independently before continuing
