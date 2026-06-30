# Data Model: Financial Dashboard

## Overview

The Financial Dashboard introduces **no new database tables**. All data is derived from existing tables via aggregation queries in `src/lib/analytics.js`.

## Existing Tables Used (read-only)

### `orders`
| Column | Type | Role in Dashboard |
|--------|------|-------------------|
| `id` | TEXT (PK) | Count for KPI total |
| `created_at` | TEXT (ISO) | Monthly grouping key (`strftime('%Y-%m', created_at)`) |
| `profit` | REAL \| NULL | Summed per month for profit chart; summed globally for KPI |

### `products` (order line items)
| Column | Type | Role in Dashboard |
|--------|------|-------------------|
| `order_id` | TEXT (FK → orders) | Count distinct per product group |
| `template_id` | TEXT (FK → product_templates) | Join key for product name |
| `quantity` | INTEGER | Revenue calculation: `quantity × unit_price` |
| `unit_price` | REAL | Revenue calculation: `quantity × unit_price` |

### `product_templates` (catalog)
| Column | Type | Role in Dashboard |
|--------|------|-------------------|
| `id` | TEXT (PK) | Join key from products |
| `name` | TEXT | Display label in top-products ranking |

---

## Computed Data Shapes

These are the serialisable data structures produced by `src/lib/analytics.js` and passed as props into chart components. They are not persisted.

### `MonthlyProfitPoint`

One entry per calendar month in the last 12 months for which at least one order exists.

```js
{
  month: "2026-01",       // ISO year-month string, e.g., "2026-01"
  label: "Ian 2026",      // Romanian abbreviated month label for chart X-axis
  totalProfit: 1250.00,   // COALESCE(SUM(orders.profit), 0) for this month
  orderCount: 5           // COUNT(*) of orders created in this month
}
```

**Constraints**:
- `totalProfit` is always a number (never null) — COALESCE ensures 0 for months with no profit entered
- `label` is generated in JavaScript from `month` string (not stored in DB)
- Array is sorted chronologically (oldest → newest)
- Maximum 12 entries; minimum 0

### `ProductSalesEntry`

One entry per product template that appears in at least one order, limited to top 10.

```js
{
  name: "Invitații Nuntă",   // product_templates.name
  orderCount: 12,             // COUNT(DISTINCT products.order_id)
  totalRevenue: 2400.00      // SUM(products.quantity * products.unit_price)
}
```

**Constraints**:
- `name` may be truncated in the chart display (≤ 22 chars); full name shown in tooltip
- Products with no `template_id` (ad-hoc additions) are excluded
- Ties in `orderCount` are broken by `name` alphabetically
- Maximum 10 entries

### `DashboardKPIs`

Single summary object for the KPI cards.

```js
{
  totalOrders: 47,         // COUNT(*) from orders
  totalProfit: 8200.00,    // COALESCE(SUM(orders.profit), 0)
  totalRevenue: 12500.00   // COALESCE(SUM(products.quantity * products.unit_price), 0)
}
```

**Constraints**:
- All values are numbers (never null)
- `totalProfit` may be 0 if no orders have the profit field filled in
- `totalRevenue` includes all orders regardless of whether profit is set

---

## Component Props Contracts

### `<KpiCard>`

```js
{
  label: string,      // Display label, e.g., "Total Comenzi"
  value: string,      // Formatted value, e.g., "47" or "8.200 RON"
  icon?: ReactNode    // Optional lucide-react icon
}
```

### `<MonthlyProfitChart>`

```js
{
  data: MonthlyProfitPoint[]   // Empty array triggers empty state
}
```

### `<TopProductsChart>`

```js
{
  data: ProductSalesEntry[]    // Empty array triggers empty state
}
```
