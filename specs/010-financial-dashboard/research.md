# Research: Financial Dashboard

## Decision 1 — Charting Library

**Decision**: recharts 2.x

**Rationale**: recharts is the leading declarative React charting library. It uses a component-based API that aligns naturally with Next.js JSX components, supports `ResponsiveContainer` for fluid layouts, and integrates with Tailwind CSS via inline `stroke`/`fill` style props pointing to CSS custom properties. It is explicitly cited in the feature request.

**Alternatives considered**:
- chart.js + react-chartjs-2: imperative canvas API, less ergonomic in React RSC/Client boundary model
- visx (Airbnb): lower-level; requires more boilerplate for simple bar + area charts
- tremor: higher-level wrapper around recharts — adds abstraction without need; project already has its own design system via shadcn/ui

---

## Decision 2 — Data Source Strategy (No New API Routes)

**Decision**: Compute all dashboard data server-side in a new `src/lib/analytics.js` via direct `DatabaseSync` queries. Data is passed as props from the RSC `DashboardData` component directly to chart components.

**Rationale**: All existing pages use this pattern (e.g., `getAllWithStatus()` in orders page). Adding a `/api/analytics/` route would introduce an unnecessary HTTP round-trip for a read-only page that has direct DB access. The dashboard is entirely read-only, so there is no mutation concern.

**Alternatives considered**:
- New `/api/analytics/` endpoints: would enable future client-side refresh without full navigation, but premature for v1 where the whole page re-fetches on each navigation (staleTimes: 0)
- React Query + REST: overkill for a static read-only page

---

## Decision 3 — Profit Field vs. Computed Revenue for Main Chart

**Decision**: Use the `orders.profit` field (REAL, manually entered per order) as the primary metric for the monthly chart. Revenue (computed as `SUM(products.quantity × products.unit_price)`) is surfaced in a KPI card only.

**Rationale**: The spec explicitly requests "evoluția profitului lunar" (monthly profit evolution). The `orders` table has a dedicated `profit` column, reflecting the business's own profit calculation. Revenue is always computable but profit is the specific requested metric. Orders with NULL profit contribute 0 via `COALESCE` — the chart still renders partial months.

**Alternatives considered**:
- Use revenue (`SUM(quantity × unit_price)`) as the chart metric: more complete (all orders have revenue), but misrepresents the requested metric as "profit"
- Show both profit and revenue as two series in the same chart: clutters the chart for v1; can be added as a future enhancement

---

## Decision 4 — Monthly Grouping Field

**Decision**: Group by `strftime('%Y-%m', created_at)` — the order creation timestamp.

**Rationale**: `created_at` is always populated (set by the DB on insert). Other date fields (`reception_date`, `event_date`, `delivery_date`) are optional and may be NULL, which would produce incomplete data in aggregations.

**Alternatives considered**:
- `reception_date`: semantically meaningful but NULL for many orders
- `delivery_date`: represents order completion, not creation — would distort timeline

---

## Decision 5 — Top Products Grouping

**Decision**: Join `products` → `product_templates` on `template_id`, group by `pt.id, pt.name`, count distinct `order_id`s, order descending by count.

**Rationale**: Products in orders are created from catalog templates. The template name is the meaningful business label. Grouping by `template_id` (not just name string) avoids false merging of renamed templates.

**Alternatives considered**:
- Group by product `name` string: brittle if template names change over time or contain typos
- Show all products including manually added (no template_id): those don't have a meaningful catalog identity and would pollute the ranking

---

## Decision 6 — Chart Components as Client Components

**Decision**: `MonthlyProfitChart.jsx` and `TopProductsChart.jsx` use `'use client'` directive. `KpiCard.jsx` stays as a Server Component.

**Rationale**: recharts uses browser APIs (`ResizeObserver`, DOM measurement) internally. recharts components must render in the browser. Data is fetched server-side and passed as serialisable props (arrays of plain objects), so the RSC→Client boundary is clean.

**Alternatives considered**:
- Server-render charts as SVG: technically possible with recharts' server-safe subset, but `ResponsiveContainer` (needed for fluid layout) requires browser DOM and cannot be server-rendered
