# Implementation Plan: Financial Dashboard

**Branch**: `010-financial-dashboard` | **Date**: 2026-06-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/010-financial-dashboard/spec.md`

## Summary

Add a read-only Dashboard page at `/dashboard` that displays: (1) an area chart of monthly profit aggregated from the `profit` field on existing orders, (2) a horizontal bar chart ranking the top 10 product templates by order frequency, and (3) three KPI summary cards (total orders, total revenue, total profit). All data is derived from the existing SQLite database via new server-side analytics query functions — no new database tables or API routes are required. recharts is added as the sole new dependency.

## Technical Context

**Language/Version**: JavaScript / Node.js 22+

**Primary Dependencies**:
- Next.js 14 (App Router, React Server Components)
- React 18.3.1
- Tailwind CSS 4.3.2
- shadcn/ui pattern (existing — Card, Skeleton primitives)
- recharts 2.x (NEW — `npm install recharts`)
- `node:sqlite` DatabaseSync (existing synchronous SQLite driver — MUST NOT be changed)

**Storage**: SQLite via `node:sqlite` (`DatabaseSync`). All dashboard data is derived via aggregation queries on existing `orders` and `products` tables. No schema changes required.

**Testing**: Playwright E2E (`tests/e2e/`), single worker (`workers: 1`, shared SQLite DB)

**Target Platform**: Web — desktop primary; tablet-sized screens required (responsive layout)

**Project Type**: Next.js 14 App Router web application

**Performance Goals**: Dashboard page fully rendered within 2 seconds on desktop. SQLite aggregation queries complete in < 50ms.

**Constraints**:
- Synchronous SQLite (`DatabaseSync`) — no async DB calls; wrap data components in `setImmediate` for RSC streaming (established pattern from feature 001)
- No TypeScript — all files use `.js` / `.jsx` extensions
- No new DB tables or migrations
- `staleTimes: { dynamic: 0 }` in `next.config.js` MUST NOT change
- `export const dynamic = 'force-dynamic'` required on `dashboard/page.js`
- recharts components are Client Components (`'use client'`) — wrap chart components accordingly

**Scale/Scope**: Single-user desktop app; hundreds of orders at most; no pagination needed

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| Code Quality | ✅ PASS | Single-responsibility analytics functions; descriptive names |
| Testing Standards | ✅ PASS | E2E acceptance tests cover all 3 user stories; data seeded via API |
| UX Consistency | ✅ PASS | KPI cards use shadcn/ui Card pattern; loading skeleton matches established pattern |
| Performance | ✅ PASS | SQLite aggregation < 50ms; 2s FCP target met on localhost |
| Design System — recharts | ⚠️ JUSTIFIED | shadcn/ui does not provide data visualisation components. recharts is the industry-standard declarative React charting library, explicitly requested in the feature description. No simpler in-design-system alternative exists. |
| Accessibility | ✅ PASS | Chart wrappers carry `role="img"` + `aria-label`; skeleton has `role="status"` + `aria-label` |
| No Dead Code | ✅ PASS | All new components consumed by dashboard page only |

## Project Structure

### Documentation (this feature)

```text
specs/010-financial-dashboard/
├── plan.md              # This file
├── research.md          # Phase 0 — technology decisions
├── data-model.md        # Phase 1 — computed data shapes
├── quickstart.md        # Phase 1 — validation guide
└── tasks.md             # Phase 2 — /speckit-tasks output
```

### Source Code

```text
src/
├── app/
│   └── dashboard/
│       ├── page.js                      # Route — Suspense + DashboardData RSC
│       └── loading.js                   # Next.js loading boundary — DashboardSkeleton
├── components/
│   ├── dashboard/
│   │   ├── MonthlyProfitChart.jsx       # 'use client' — recharts AreaChart
│   │   ├── TopProductsChart.jsx         # 'use client' — recharts horizontal BarChart
│   │   └── KpiCard.jsx                  # shadcn Card — single metric display
│   └── skeletons/
│       └── DashboardSkeleton.jsx        # Skeleton layout matching dashboard shape
└── lib/
    └── analytics.js                     # Synchronous SQLite aggregation functions

src/lib/navigation.js                    # MODIFY — add Dashboard nav entry
tests/e2e/dashboard.spec.js             # NEW — Playwright E2E for all 3 user stories
```

## Implementation Design

### Analytics Library — `src/lib/analytics.js`

Three synchronous functions using the existing `DatabaseSync` pattern from `src/lib/db.js`:

**`getMonthlyProfitData(months = 12)`**
```sql
SELECT strftime('%Y-%m', created_at) AS month,
       COALESCE(SUM(profit), 0)      AS totalProfit,
       COUNT(*)                       AS orderCount
FROM orders
WHERE created_at >= date('now', '-' || :months || ' months')
GROUP BY month
ORDER BY month ASC
```
Returns: `Array<{ month: string, totalProfit: number, orderCount: number }>`

Months with all-NULL profit contribute 0 via `COALESCE`. Empty array returned when no orders exist.

**`getTopProducts(limit = 10)`**
```sql
SELECT pt.name,
       COUNT(DISTINCT p.order_id)      AS orderCount,
       SUM(p.quantity * p.unit_price)  AS totalRevenue
FROM products p
JOIN product_templates pt ON p.template_id = pt.id
GROUP BY pt.id, pt.name
ORDER BY orderCount DESC
LIMIT :limit
```
Returns: `Array<{ name: string, orderCount: number, totalRevenue: number }>`

Products without a `template_id` (manually added) are excluded from the ranking.

**`getDashboardKPIs()`**
```sql
SELECT COUNT(*)           AS totalOrders,
       COALESCE(SUM(profit), 0) AS totalProfit
FROM orders;

SELECT COALESCE(SUM(quantity * unit_price), 0) AS totalRevenue
FROM products;
```
Returns: `{ totalOrders: number, totalProfit: number, totalRevenue: number }`

Two separate queries; results merged into a single object before returning.

### Chart Components

**`MonthlyProfitChart.jsx`** — `'use client'`
- recharts `AreaChart` inside `ResponsiveContainer` (`width="100%" height={300}`)
- X-axis: abbreviated Romanian month label (e.g., `"Ian 2026"`)
- Y-axis: profit value in RON
- `Area` fill with stroke matching Tailwind `--color-primary`
- Tooltip: shows profit (RON) + order count for the hovered month
- Empty state: friendly Romanian message when `data.length === 0`

**`TopProductsChart.jsx`** — `'use client'`
- recharts `BarChart` with `layout="vertical"` inside `ResponsiveContainer` (`height={320}`)
- Y-axis: product name (truncated at 22 chars with `…`)
- X-axis: order count (integer ticks)
- Bar fill matching Tailwind `--color-primary`
- Empty state: friendly Romanian message when `data.length === 0`

**`KpiCard.jsx`** — Server Component (no client state needed)
- Props: `{ label: string, value: string | number, unit?: string }`
- shadcn/ui `Card` wrapper with `CardHeader` (label) + `CardContent` (large value)
- Three instances rendered in a responsive 3-column grid

### Page Structure

**`src/app/dashboard/page.js`**
```
export const dynamic = 'force-dynamic'

Page()
  └── <Suspense fallback={<DashboardSkeleton />}>
        <DashboardData />
      </Suspense>

async DashboardData()
  1. await new Promise(resolve => setImmediate(resolve))   // enables RSC streaming
  2. kpis     = getDashboardKPIs()
  3. monthly  = getMonthlyProfitData(12)
  4. products = getTopProducts(10)
  5. return JSX:
       <div className="mx-auto max-w-6xl p-6 flex flex-col gap-6">
         <h1>Dashboard</h1>
         <section aria-label="KPI-uri">          3 × <KpiCard />  </section>
         <section aria-label="Profit lunar">     <MonthlyProfitChart data={monthly} /> </section>
         <section aria-label="Top produse">      <TopProductsChart data={products} /> </section>
       </div>
```

**`src/app/dashboard/loading.js`**
```
export default function Loading() { return <DashboardSkeleton />; }
```

### Skeleton — `DashboardSkeleton.jsx`

```
role="status" aria-label="Se încarcă…"
max-w-6xl p-6 flex flex-col gap-6

Row: 3 × Skeleton h-24 rounded-lg (KPI cards)
Skeleton h-72 rounded-lg              (monthly chart)
Skeleton h-56 rounded-lg              (top products chart)
```

### Navigation Update — `src/lib/navigation.js`

Add entry: `{ label: 'Dashboard', href: '/dashboard' }`

Position: after 'Stoc Materiale' (last entry), making it the 4th nav link.

### Dependency Installation

```bash
npm install recharts
```

recharts has peer deps on React and react-dom (both satisfied by existing React 18.3.1).
