# Tasks: Suspense Streaming & Progressive Loading

**Input**: Design documents from `specs/001-suspense-streaming/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | quickstart.md ✅

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependency conflicts)
- **[Story]**: Which user story this task belongs to (US1 / US2 / US3)
- Exact file paths are included in all descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Shared building blocks required by all three routes before any route-level work begins.

- [X] T001 [P] Create `src/components/ui/skeleton.jsx` — shadcn/ui Skeleton primitive (`animate-pulse rounded-md bg-muted`); export named `Skeleton`; accept `className` and spread remaining HTML div props
- [X] T002 [P] Create `src/app/error.js` — Client Component root error boundary; display Romanian user-readable message "A apărut o eroare. Te rugăm să încerci din nou." with a reset button; `role="alert"`; no stack trace exposed

**Checkpoint**: Skeleton primitive and error boundary exist. Route-level work can begin.

---

## Phase 2: Foundational (Blocking Prerequisites)

No additional foundation needed beyond Phase 1 for this feature. All routes depend only on `src/components/ui/skeleton.jsx` (T001).

---

## Phase 3: User Story 1 — Immediate Visual Feedback on Navigation (Priority: P1) 🎯 MVP

**Goal**: Every navigation to `/`, `/catalog`, and `/stoc-materiale` immediately shows a structured skeleton placeholder before any data arrives.

**Independent Test**: Navigate to `http://localhost:3000` with network throttled to Slow 3G in DevTools. A skeleton structure (filter bar + 5 order-row placeholders with shimmer) must be visible before any order data appears.

### Skeleton Components (parallel, all depend on T001)

- [X] T003 [P] [US1] Create `src/components/skeletons/OrdersListSkeleton.jsx` — matches `OrderList` layout: outer `div` with `mx-auto max-w-6xl p-6 flex flex-col gap-2 role="status" aria-label="Se încarcă…"`; one filter-bar row (`Skeleton h-10 w-full rounded-lg`); five order-row cards (`rounded-lg border border-border bg-card shadow-sm px-4 py-3 flex items-center gap-2`) each containing: arrow (`Skeleton h-3 w-3.5 shrink-0`), name (`Skeleton h-4 flex-1 max-w-xs`), two badge pills (`Skeleton h-5 w-16 rounded-full`), action area (`Skeleton h-8 w-16 rounded-md`)
- [X] T004 [P] [US1] Create `src/components/skeletons/CatalogPageSkeleton.jsx` — matches `CatalogPage` layout: outer `div` with `mx-auto max-w-4xl p-6 flex flex-col gap-4 role="status" aria-label="Se încarcă…"`; one form row (`flex gap-2`: `Skeleton h-10 flex-1` + `Skeleton h-10 w-24 rounded-md`); five catalog-item rows (`rounded-lg border border-border bg-card p-4 flex items-start justify-between gap-3`) each containing: left block (`flex flex-col gap-1`: `Skeleton h-5 w-40` name + `Skeleton h-4 w-64` description) and right block (`flex gap-2`: `Skeleton h-8 w-20 rounded-md` × 2)
- [X] T005 [P] [US1] Create `src/components/skeletons/MaterialsPageSkeleton.jsx` — matches `MaterialsPage` layout: outer `div` with `mx-auto max-w-4xl p-6 flex flex-col gap-4 role="status" aria-label="Se încarcă…"`; one form-area row (`Skeleton h-10 w-full`); five material rows (`rounded-lg border border-border bg-card px-4 py-3 flex items-center gap-4`) each containing: name (`Skeleton h-4 w-32`), stock value (`Skeleton h-4 w-16`), min-stock (`Skeleton h-4 w-16`), unit (`Skeleton h-4 w-10`), two action icon buttons (`Skeleton h-8 w-8 rounded-md` × 2)

### Route Wiring for `/` (depends on T003)

- [X] T006 [P] [US1] Modify `src/app/page.js` — import `Suspense` from `react` and `OrdersListSkeleton` from `@/components/skeletons/OrdersListSkeleton`; change default export to a synchronous component that returns `<Suspense fallback={<OrdersListSkeleton />}><OrdersData /></Suspense>`; add local `async function OrdersData()` that calls `getAllWithStatus()` and returns `<OrderList initialOrders={orders} />`; preserve `export const dynamic = 'force-dynamic'`
- [X] T007 [P] [US1] Create `src/app/loading.js` — import `OrdersListSkeleton` from `@/components/skeletons/OrdersListSkeleton`; export default `function Loading() { return <OrdersListSkeleton />; }`

### Route Wiring for `/catalog` (depends on T004)

- [X] T008 [P] [US1] Modify `src/app/catalog/page.js` — import `Suspense` from `react` and `CatalogPageSkeleton` from `@/components/skeletons/CatalogPageSkeleton`; change default export to return `<Suspense fallback={<CatalogPageSkeleton />}><CatalogData /></Suspense>`; add local `async function CatalogData()` that calls `listAll()` and returns `<CatalogPage initialTemplates={templates} />`; preserve `export const dynamic = 'force-dynamic'` and `export const metadata`
- [X] T009 [P] [US1] Create `src/app/catalog/loading.js` — import `CatalogPageSkeleton` from `@/components/skeletons/CatalogPageSkeleton`; export default `function Loading() { return <CatalogPageSkeleton />; }`

### Route Wiring for `/stoc-materiale` (depends on T005)

- [X] T010 [P] [US1] Modify `src/app/stoc-materiale/page.js` — import `Suspense` from `react` and `MaterialsPageSkeleton` from `@/components/skeletons/MaterialsPageSkeleton`; change default export to return `<Suspense fallback={<MaterialsPageSkeleton />}><StocMaterialeData /></Suspense>`; add local `async function StocMaterialeData()` that calls `listAll()` from `../../lib/materials.js` and returns `<MaterialsPage initialMaterials={materials} />`; preserve `export const dynamic = 'force-dynamic'` and `export const metadata`
- [X] T011 [P] [US1] Create `src/app/stoc-materiale/loading.js` — import `MaterialsPageSkeleton` from `@/components/skeletons/MaterialsPageSkeleton`; export default `function Loading() { return <MaterialsPageSkeleton />; }`

**Checkpoint**: All three routes show a skeleton placeholder on navigation. Manually verify on `http://localhost:3000` with Slow 3G throttling. User Story 1 independently complete.

---

## Phase 4: User Story 2 — Consistent Skeleton Shape Across the App (Priority: P2)

**Goal**: E2E tests confirm that skeleton row count and visual structure match the real content layout for all three routes.

**Independent Test**: Run `npm run test:e2e -- --grep "loading skeleton"` and all assertions pass — skeleton row count, shimmer class, and layout structure verified programmatically.

- [X] T012 [US2] Write Playwright E2E test suite in `tests/e2e/loading-skeleton.spec.js` — use `page.route()` to delay the SQLite response artificially if needed, or set CPU throttle; for each of the three routes assert: (a) a skeleton element with `role="status"` is visible before any real data rows appear, (b) exactly 5 skeleton row placeholders exist (matching the 5-row design in data-model.md), (c) skeleton containers include the `animate-pulse` class, (d) after skeleton resolves the real content section is visible and skeleton is removed; test names must map 1-to-1 with spec.md US1 acceptance scenarios 1–4
- [ ] T013 [P] [US2] Review and adjust skeleton column widths in `src/components/skeletons/OrdersListSkeleton.jsx`, `CatalogPageSkeleton.jsx`, and `MaterialsPageSkeleton.jsx` if visual comparison against the live app (via `npm run dev`) reveals any layout shift — use browser DevTools to measure column positions before and after skeleton resolves; CLS must be visually imperceptible

**Checkpoint**: E2E tests for skeleton shape pass. User Story 2 independently complete.

---

## Phase 5: User Story 3 — No Regression in Data Freshness (Priority: P3)

**Goal**: Automated tests confirm that the latest database state is visible after the skeleton resolves, for all three routes, on every navigation.

**Independent Test**: In `tests/e2e/loading-skeleton.spec.js`, after the data freshness tests pass, the test suite confirms an order created before the test navigation appears in the resolved content.

- [X] T014 [US3] Extend `tests/e2e/loading-skeleton.spec.js` with three data freshness test cases: (1) seed an order via API, navigate to `/`, wait for skeleton to resolve, assert the seeded order name appears in the rendered list; (2) seed a catalog template via API, navigate to `/catalog`, assert it appears after skeleton; (3) seed a material via API, navigate to `/stoc-materiale`, assert it appears after skeleton; each test must clean up its seed data using the delete API after assertion
- [X] T015 [US3] Run full E2E suite `npm run test:e2e` and confirm all pre-existing spec files pass without regression — pay special attention to `tests/e2e/expand-order.spec.js`, `tests/e2e/catalog-crud.spec.js`, and `tests/e2e/materials-stock.spec.js` which navigate to the modified routes

**Checkpoint**: All user stories pass automated tests. Data freshness contract verified. User Story 3 complete.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Build verification, quickstart validation, and final checks.

- [X] T016 [P] Run `npm run build` from repo root and confirm clean output — no import errors, no unresolved module paths in the new `loading.js` files or skeleton components; fix any JSX parsing issues in `.js` route files
- [ ] T017 [P] Manually run quickstart.md Scenarios 1–5 against the dev server — start `npm run dev`, follow each scenario step-by-step, confirm expected outcomes; note any failures as issues

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 3 (US1)**: T003, T004, T005 require T001 complete; T006/T007 require T003; T008/T009 require T004; T010/T011 require T005
- **Phase 4 (US2)**: Requires Phase 3 complete (all skeleton components and route wiring in place)
- **Phase 5 (US3)**: Requires Phase 3 complete (routes must render real data after skeleton)
- **Phase 6 (Polish)**: Requires Phase 3, 4, and 5 complete

### User Story Dependencies

- **US1 (P1)**: Depends on T001 (Skeleton primitive) — no other story dependencies
- **US2 (P2)**: Depends on US1 completion (skeleton components must exist to test their shape)
- **US3 (P3)**: Depends on US1 completion (routes must be wired before freshness can be verified)

### Within Phase 3

- T003, T004, T005 are fully parallel (different files, same dep on T001)
- T006 + T007 are parallel with each other; both require T003
- T008 + T009 are parallel with each other; both require T004
- T010 + T011 are parallel with each other; both require T005
- Once T003 + T004 + T005 are done, T006 through T011 can all run in parallel (all different files)

---

## Parallel Example: Phase 3 (US1)

```bash
# Wave 1: Skeleton components (parallel after T001 done)
Task T003: "Create src/components/skeletons/OrdersListSkeleton.jsx"
Task T004: "Create src/components/skeletons/CatalogPageSkeleton.jsx"
Task T005: "Create src/components/skeletons/MaterialsPageSkeleton.jsx"

# Wave 2: Route wiring (all parallel once Wave 1 completes)
Task T006: "Modify src/app/page.js"
Task T007: "Create src/app/loading.js"
Task T008: "Modify src/app/catalog/page.js"
Task T009: "Create src/app/catalog/loading.js"
Task T010: "Modify src/app/stoc-materiale/page.js"
Task T011: "Create src/app/stoc-materiale/loading.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: T001, T002
2. Complete Phase 3: T003 → T004 → T005 (parallel), then T006–T011 (parallel)
3. **STOP and VALIDATE**: Navigate to `http://localhost:3000` with Slow 3G throttling; confirm skeleton appears before data on all three routes
4. Feature is visually complete and shippable

### Incremental Delivery

1. **Phase 1** → Foundation ready (2 tasks)
2. **Phase 3** → Loading infrastructure complete; skeletons appear on all routes (9 tasks, MVP!)
3. **Phase 4** → Shapes verified by E2E tests; consistency confirmed (2 tasks)
4. **Phase 5** → Data freshness regression tests added; full suite green (2 tasks)
5. **Phase 6** → Build clean; quickstart validated; done (2 tasks)

---

## Notes

- `[P]` tasks = different files, no incomplete dependencies — safe to run concurrently
- `export const dynamic = 'force-dynamic'` MUST remain on all three modified `page.js` files — verify after each modification
- `next.config.js` (`staleTimes: { dynamic: 0 }`) MUST NOT change — data freshness depends on it
- No new npm packages — `skeleton.jsx` is created manually (no `npx shadcn@latest add skeleton`)
- `.js` file extension for route files (`loading.js`, `page.js`); `.jsx` for new components
- E2E tests live in `tests/e2e/` consistent with all other Playwright specs in the project
