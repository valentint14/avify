# Data Model: Mod producție

## Overview

No new database tables or columns are introduced. The feature is a read-only aggregation view over existing tables.

## Existing Tables Used

### `products` (source table)

| Column           | Type    | Role in this feature                                  |
|------------------|---------|-------------------------------------------------------|
| `id`             | TEXT PK | Identifies individual product records                 |
| `order_id`       | TEXT FK | Joins to `orders` for client name                     |
| `name`           | TEXT    | Fallback group label when `template_id` is NULL       |
| `status`         | TEXT    | Filter: only `'de_realizat'` products included        |
| `template_id`    | TEXT FK | Primary grouping key (nullable)                       |
| `quantity`       | INTEGER | Summed per group to produce `totalQuantity`           |

### `product_templates` (grouping label source)

| Column | Type    | Role in this feature            |
|--------|---------|---------------------------------|
| `id`   | TEXT PK | Matched via `products.template_id` |
| `name` | TEXT    | Display label for template-based groups |

### `orders` (contributing order metadata)

| Column   | Type | Role in this feature                          |
|----------|------|-----------------------------------------------|
| `id`     | TEXT PK | Included in per-order breakdown              |
| `name`   | TEXT | Order display name in drill-down             |
| `client` | TEXT | Client name (nullable) in drill-down         |

## Derived Aggregate: `ProductionGroup`

Not persisted. Computed by `getProductionQueue()` in `src/lib/productionQueue.js`.

```
ProductionGroup {
  key:           string   // COALESCE(pt.id, 'ad_hoc_' + p.name) — stable, unique per group
  label:         string   // COALESCE(pt.name, p.name) — display name
  templateId:    string | null  // pt.id if template-based; null if ad-hoc
  totalQuantity: number   // SUM(p.quantity) across all de_realizat products in this group
  orders: ContributingOrder[]
}

ContributingOrder {
  orderId:   string
  orderName: string
  client:    string | null
  quantity:  number        // this order's quantity for this group
}
```

## Aggregation Query

```sql
SELECT
  COALESCE(pt.id, 'ad_hoc_' || p.name)   AS group_key,
  COALESCE(pt.name, p.name)               AS group_label,
  pt.id                                   AS template_id,
  SUM(p.quantity)                         AS total_quantity,
  json_group_array(
    json_object(
      'orderId',   o.id,
      'orderName', o.name,
      'client',    o.client,
      'quantity',  p.quantity
    )
  )                                       AS contributing_orders_json
FROM products p
LEFT JOIN product_templates pt ON p.template_id = pt.id
JOIN       orders o            ON p.order_id   = o.id
WHERE p.status = 'de_realizat'
GROUP BY COALESCE(pt.id, p.name)
ORDER BY SUM(p.quantity) DESC
```

**Notes**:
- `LEFT JOIN product_templates` ensures ad-hoc products (NULL `template_id`) are not dropped.
- `JOIN orders` is an INNER JOIN — products without a matching order are impossible by FK constraint but this makes the intent explicit.
- `GROUP BY COALESCE(pt.id, p.name)` — template-based products group by template UUID; ad-hoc products group by their name string.
- `json_group_array` produces one JSON array string per group; parsed with `JSON.parse()` in `getProductionQueue()`.
- Result is sorted by `SUM(p.quantity) DESC` (FR-005).

## State Transitions (read-only view)

This page does not mutate any data. Quantities and statuses change only through existing flows (order creation, product status updates in the Kanban board). The production queue reflects current DB state at load or refresh time.
