# Tasks: Financial Dashboard

**Input**: Design documents from `specs/010-financial-dashboard/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | quickstart.md ✅

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependency conflicts)
- **[Story]**: Which user story this task belongs to (US1 / US2 / US3)
- Exact file paths are included in all descriptions

---

## Phase 1: Setup

**Purpose**: Install the sole new dependency before any feature work begins.

- [X] T001 Install recharts — run `npm install recharts` from repo root; verify `recharts` appears in `package.json` dependencies

**Checkpoint**: `recharts` available in node_modules. All subsequent tasks can proceed.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared infrastructure required by all three user stories.

- [X] T002 [P] Create `src/lib/analytics.js` — import `db` from `./db.js`; export three synchronous functions using the `DatabaseSync` pattern: (1) `getMonthlyProfitData(months=12)` — SQL: `SELECT strftime('%Y-%m', created_at) AS month, COALESCE(SUM(profit), 0) AS totalProfit, COUNT(*) AS orderCount FROM orders WHERE created_at >= date('now', '-' || months || ' months') GROUP BY month ORDER BY month ASC`; also compute a `label` field in JS (Romanian abbreviated month, e.g., `"Ian 2026"` from `"2026-01"`); returns `Array<{month, label, totalProfit, orderCount}>`; (2) `getTopProducts(limit=10)` — SQL: `SELECT pt.name, COUNT(DISTINCT p.order_id) AS orderCount, SUM(p.quantity * p.unit_price) AS totalRevenue FROM products p JOIN product_templates pt ON p.template_id = pt.id GROUP BY pt.id, pt.name ORDER BY orderCount DESC LIMIT ?`; returns `Array<{name, orderCount, totalRevenue}>`; (3) `getDashboardKPIs()` — two queries: `SELECT COUNT(*) AS totalOrders, COALESCE(SUM(profit), 0) AS totalProfit FROM orders` and `SELECT COALESCE(SUM(quantity * unit_price), 0) AS totalRevenue FROM products`; returns `{totalOrders, totalProfit, totalRevenue}`; see data-model.md for full return shapes

- [X] T003 [P] Create `src/components/skeletons/DashboardSkeleton.jsx` — import `Skeleton` from `@/components/ui/skeleton`; outer `div` with `role="status"` `aria-label="Se încarcă…"` `className="mx-auto flex max-w-6xl flex-col gap-6 p-6"`; three children: (1) `div` with `className="grid grid-cols-3 gap-4"` containing three `<Skeleton className="h-24 rounded-lg" />`; (2) `<Skeleton className="h-72 w-full rounded-lg" />`; (3) `<Skeleton className="h-56 w-full rounded-lg" />`

- [X] T004 [P] Modify `src/lib/navigation.js` — add `{ label: 'Dashboard', href: '/dashboard' }` as the fourth entry in the `NAV_LINKS` array, after `{ label: 'Stoc Materiale', href: '/stoc-materiale' }`

- [X] T005 Create `src/app/dashboard/loading.js` — import `DashboardSkeleton` from `@/components/skeletons/DashboardSkeleton`; export default `function Loading() { return <DashboardSkeleton />; }` (requires T003 to exist first)

**Checkpoint**: Analytics functions, skeleton, nav link, and loading boundary all exist. User story implementation can begin.

---

## Phase 3: User Story 1 — Monthly Profit Evolution Chart (Priority: P1) 🎯 MVP

**Goal**: Dashboard page at `/dashboard` displays a time-series area chart of monthly profit derived from the `orders.profit` field.

**Independent Test**: Navigate to `/dashboard` with at least one order that has a `profit` value set. A section labelled "Profit lunar" containing a chart must be visible within 2 seconds.

- [X] T006 [P] [US1] Create `src/components/dashboard/MonthlyProfitChart.jsx` — add `'use client'` directive as first line; import from `recharts`: `{ AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer }`; component accepts prop `data` (`Array<{month, label, totalProfit, orderCount}>`); if `data.length === 0` return `<p className="py-8 text-center text-muted-foreground">Nu există date de profit înregistrate.</p>`; otherwise return `<ResponsiveContainer width="100%" height={300}><AreaChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip formatter={(value) => [`${value} RON`, 'Profit']} /><Area type="monotone" dataKey="totalProfit" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} /></AreaChart></ResponsiveContainer>`; export as default

- [X] T007 [US1] Create `src/app/dashboard/page.js` — import `Suspense` from `react`; import `DashboardSkeleton` from `@/components/skeletons/DashboardSkeleton`; import `MonthlyProfitChart` from `@/components/dashboard/MonthlyProfitChart`; import `{ getMonthlyProfitData }` from `@/lib/analytics`; add `export const dynamic = 'force-dynamic'`; default export `function Page()` returns `<Suspense fallback={<DashboardSkeleton />}><DashboardData /></Suspense>`; add `async function DashboardData()` that: (1) `await new Promise(resolve => setImmediate(resolve))` for RSC streaming, (2) const `monthly = getMonthlyProfitData(12)`, (3) returns `<div className="mx-auto flex max-w-6xl flex-col gap-6 p-6"><h1 className="text-2xl font-bold">Dashboard</h1><section aria-label="Profit lunar"><h2 className="mb-4 text-lg font-semibold">Evoluție Profit Lunar</h2><MonthlyProfitChart data={monthly} /></section></div>` (requires T002, T003, T006)

- [X] T008 [US1] Create `tests/e2e/dashboard.spec.js` — import `{ test, expect }` from `@playwright/test`; add API helpers `seedOrder(request, name, profit)` and `clearOrders(request)` following the pattern from `tests/e2e/loading-skeleton.spec.js`; write describe block `'Feature 010 — dashboard: US1 monthly profit chart'` with tests: (1) `'Dashboard nav link is visible and navigates to /dashboard'` — `page.goto('/')`, click nav link "Dashboard", assert `page.url()` ends with `/dashboard`; (2) `'Monthly profit chart section is visible'` — seed an order with profit via API, `page.goto('/dashboard')`, assert `page.locator('section[aria-label="Profit lunar"]')` is visible within 5000ms, delete seeded order; (3) `'Empty state shown when no orders exist'` — clear all orders via API, `page.goto('/dashboard')`, assert text "Nu există date de profit înregistrate." is visible (requires T007 to be working)

**Checkpoint**: `/dashboard` is reachable from the nav bar. Monthly profit chart renders with real or empty data. US1 independently complete.

---

## Phase 4: User Story 2 — Top-Selling Products Ranking (Priority: P2)

**Goal**: Dashboard shows a horizontal bar chart of top 10 products ordered by frequency across all orders, below the profit chart.

**Independent Test**: Seed 2 orders using the same catalog template product; navigate to `/dashboard`. A section labelled "Top produse" must list that product with a count of 2.

- [X] T009 [P] [US2] Create `src/components/dashboard/TopProductsChart.jsx` — add `'use client'` directive as first line; import from `recharts`: `{ BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell }`; component accepts prop `data` (`Array<{name, orderCount, totalRevenue}>`); if `data.length === 0` return `<p className="py-8 text-center text-muted-foreground">Nu există produse în comenzi.</p>`; otherwise return `<ResponsiveContainer width="100%" height={Math.max(data.length * 40, 200)}><BarChart data={data} layout="vertical" margin={{ left: 16, right: 16 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" tick={{ fontSize: 12 }} /><YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} tickFormatter={(v) => v.length > 22 ? v.slice(0, 22) + '…' : v} /><Tooltip formatter={(value) => [value, 'Comenzi']} /><Bar dataKey="orderCount" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer>`; export as default

- [X] T010 [US2] Modify `src/app/dashboard/page.js` — add import for `TopProductsChart` from `@/components/dashboard/TopProductsChart`; add import for `getTopProducts` from `@/lib/analytics`; inside `DashboardData()`, add `const products = getTopProducts(10)` after the existing monthly fetch; add a second section below the profit section: `<section aria-label="Top produse"><h2 className="mb-4 text-lg font-semibold">Cele Mai Vândute Produse</h2><TopProductsChart data={products} /></section>` (requires T009)

- [X] T011 [US2] Add US2 test block to `tests/e2e/dashboard.spec.js` — add helpers `seedCatalogTemplate(request, name)` and `seedOrderWithTemplate(request, orderName, templateId)` and `clearCatalog(request)`, `clearOrders(request)`; add describe `'Feature 010 — dashboard: US2 top products ranking'` with tests: (1) `'Top products section is visible with seeded data'` — seed a template "Produs Test Dashboard", seed 2 orders using that template, navigate to `/dashboard`, assert `section[aria-label="Top produse"]` is visible, assert the section contains text "Produs Test Dashboard", cleanup; (2) `'Top products empty state shown when no orders exist'` — clear all orders, navigate to `/dashboard`, assert text "Nu există produse în comenzi." is visible (requires T010 to be working)

**Checkpoint**: Dashboard shows both the monthly profit chart and the top products ranking. US2 independently complete.

---

## Phase 5: User Story 3 — Summary KPI Cards (Priority: P3)

**Goal**: Three summary metric cards appear at the top of the Dashboard, above the charts, showing total orders, total revenue, and total profit.

**Independent Test**: Navigate to `/dashboard`. Three card elements must be visible with numeric values, each with a descriptive label.

- [X] T012 [P] [US3] Create `src/components/dashboard/KpiCard.jsx` — no `'use client'` needed (pure display); accepts props `{ label, value, unit }` where `unit` is optional; return a `div` with `className="rounded-lg border border-border bg-card p-6 shadow-sm flex flex-col gap-1"` containing: `<p className="text-sm text-muted-foreground">{label}</p>` and `<p className="text-3xl font-bold tracking-tight">{value}{unit ? <span className="text-base font-normal text-muted-foreground ml-1">{unit}</span> : null}</p>`; export as default

- [X] T013 [US3] Modify `src/app/dashboard/page.js` — add import for `KpiCard` from `@/components/dashboard/KpiCard`; add import for `getDashboardKPIs` from `@/lib/analytics`; inside `DashboardData()`, add `const kpis = getDashboardKPIs()` alongside the existing fetches; add a KPI grid section as the FIRST child inside the outer div, before the existing sections: `<section aria-label="KPI-uri" className="grid grid-cols-1 gap-4 sm:grid-cols-3"><KpiCard label="Total Comenzi" value={kpis.totalOrders} /><KpiCard label="Venituri Totale" value={kpis.totalRevenue.toFixed(2)} unit="RON" /><KpiCard label="Profit Total" value={kpis.totalProfit.toFixed(2)} unit="RON" /></section>` (requires T012)

- [X] T014 [US3] Add US3 test block to `tests/e2e/dashboard.spec.js` — add describe `'Feature 010 — dashboard: US3 KPI cards'` with tests: (1) `'Three KPI cards are visible'` — navigate to `/dashboard`, assert `section[aria-label="KPI-uri"]` is visible, assert it contains exactly 3 `div.shadow-sm` elements; (2) `'KPI card values are numeric'` — assert each of the 3 cards contains at least one visible numeric value (digit character); (3) `'KPI total orders matches actual order count'` — clear orders, seed 2 orders via API, navigate to `/dashboard`, assert text "2" appears in the "Total Comenzi" card, cleanup seeded orders (requires T013 to be working)

**Checkpoint**: All three user stories are complete. Dashboard shows KPI cards + monthly profit chart + top products ranking.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Build verification and manual validation.

- [X] T015 [P] Run `npm run build` from repo root and confirm clean output — no import errors for recharts or new components; all three routes (`/`, `/catalog`, `/stoc-materiale`, `/dashboard`) show as `ƒ (Dynamic)`; fix any JSX or module resolution issues

- [X] T016 [P] Manually run quickstart.md Scenarios 1–6 against dev server (`npm run dev`) — verify each scenario produces the expected outcome; note any visual issues (chart overflow, mobile layout) as follow-up items

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Requires T001 complete; T002, T003, T004 can run in parallel; T005 requires T003
- **Phase 3 (US1)**: Requires Phase 2 complete; T006 and T007 can run in parallel; T008 requires T007
- **Phase 4 (US2)**: Requires Phase 3 complete; T009 can run in parallel with T008; T010 requires T009; T011 requires T010
- **Phase 5 (US3)**: Requires Phase 4 complete; T012 can run in parallel; T013 requires T012; T014 requires T013
- **Phase 6 (Polish)**: Requires Phase 5 complete; T015 and T016 are parallel

### Within Phase 2

- T002, T003, T004 are fully parallel (different files, no shared dependencies)
- T005 depends on T003 (imports DashboardSkeleton)

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 2 completion only
- **US2 (P2)**: Depends on US1 (same page.js file — added incrementally)
- **US3 (P3)**: Depends on US2 (same page.js file — added incrementally)

---

## Parallel Example: Phase 2

```bash
# All three can start immediately after T001:
Task T002: "Create src/lib/analytics.js"
Task T003: "Create src/components/skeletons/DashboardSkeleton.jsx"
Task T004: "Modify src/lib/navigation.js"

# After T003 completes:
Task T005: "Create src/app/dashboard/loading.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (T001) and Phase 2 (T002–T005)
2. Complete Phase 3 (T006–T008)
3. **STOP and VALIDATE**: Navigate to `http://localhost:3000/dashboard` — Dashboard link in nav, monthly profit chart visible (or empty state), loading skeleton appears on navigation
4. Feature is independently useful and shippable as-is

### Incremental Delivery

1. **Phase 1 + Phase 2** → Shared infrastructure ready (recharts installed, analytics functions, skeleton, nav link)
2. **Phase 3** → `/dashboard` page live with monthly profit chart (MVP)
3. **Phase 4** → Top products ranking added below chart
4. **Phase 5** → KPI summary cards added above charts
5. **Phase 6** → Build verified; quickstart scenarios confirmed

---

## Notes

- `[P]` tasks = different files, no incomplete dependencies — safe to run concurrently
- `export const dynamic = 'force-dynamic'` MUST be on `src/app/dashboard/page.js`
- `recharts` chart components MUST have `'use client'` — they use browser DOM APIs
- `KpiCard` is a Server Component (no interactivity) — do NOT add `'use client'`
- `setImmediate` in `DashboardData()` follows the established pattern from feature 001
- `next.config.js` (`staleTimes: { dynamic: 0 }`) MUST NOT change
- E2E tests follow the seeding pattern from `tests/e2e/loading-skeleton.spec.js`
