# Data Model: Generează Listă Cumpărături (Shopping List Generator)

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

## Existing Tables (read-only — no schema changes)

All entities below are existing tables queried by `getShoppingList()`. No migrations needed.

### `orders`
| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID |
| `name` | TEXT | Order name |
| `event_date` | TEXT | `YYYY-MM-DD`; may be NULL |
| `delivery_date` | TEXT | `YYYY-MM-DD`; may be NULL |
| *(others)* | — | `client`, `created_at`, etc. — not used in this feature |

**Scope filter**: Only orders where `event_date` OR `delivery_date` falls within `[today, today+30]` are in scope.

---

### `products`
| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID |
| `order_id` | TEXT FK → `orders.id` | ON DELETE CASCADE |
| `template_id` | TEXT FK → `product_templates.id` | NULL for ad-hoc products |
| `quantity` | INTEGER | Pieces to produce (default 1) |
| `status` | TEXT | `'de_realizat'`, `'in_realizare'`, `'realizat'` |
| *(others)* | — | `name`, `created_at`, etc. — not used in this feature |

**Scope filter**: Only products with `status IN ('de_realizat', 'in_realizare')` are included. Products with `status = 'realizat'` are excluded.

**Excluded products** (counted separately):
- Products with `template_id IS NULL` (ad-hoc)
- Products whose template has no recipe lines with `qty_per_piece > 0`

---

### `product_templates`
| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID |
| `name` | TEXT | Template name |
| *(others)* | — | `description`, `created_at` — not used |

Used only as the join bridge between `products` and `recipe_lines`.

---

### `recipe_lines`
| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID |
| `template_id` | TEXT FK → `product_templates.id` | ON DELETE CASCADE |
| `material_id` | TEXT FK → `materials.id` | ON DELETE CASCADE |
| `qty_per_piece` | REAL | Material quantity needed per product piece |
| *(others)* | — | `created_at` — not used |

**UNIQUE constraint**: `(template_id, material_id)` — one recipe line per material per template.

**Filter**: Only lines with `qty_per_piece > 0` contribute to the shopping list (guards against data-entry errors).

---

### `materials`
| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID |
| `name` | TEXT | Material name (display) |
| `current_stock` | REAL | Current stock level |
| `unit` | TEXT | Unit of measure (may be NULL) |
| *(others)* | — | `min_stock`, `created_at` — not used in shopping list |

---

## Derived Entities (non-persisted, computed per request)

### `ShoppingListRow`

One row per material that has at least one qualifying recipe contribution.

| Field | Type | Derivation |
|-------|------|------------|
| `materialId` | string | `materials.id` |
| `materialName` | string | `materials.name` |
| `unit` | string \| null | `materials.unit` |
| `totalRequired` | number | `SUM(rl.qty_per_piece * p.quantity)` across all qualifying products |
| `currentStock` | number | `materials.current_stock` at query time |
| `toBuy` | number | `MAX(0, totalRequired − currentStock)` |

**Display split**:
- `toBuy > 0` → "to buy" section (primary, visible by default)
- `toBuy === 0` → "already covered" section (secondary, distinguishable per FR-009)

---

### `ShoppingListResult`

The full response returned by `getShoppingList()` and the API route.

| Field | Type | Notes |
|-------|------|-------|
| `rows` | `ShoppingListRow[]` | Sorted by `materialName` ASC; may be empty |
| `excludedCount` | number | Count of in-scope products that could not be calculated (no template or no recipe) |
| `generatedAt` | string | ISO-8601 timestamp of the calculation |

**Empty state logic** (evaluated client-side):
- `rows.length === 0` AND `excludedCount === 0` → no qualifying orders (show FR-010 message)
- `rows.length > 0` AND all `toBuy === 0` → all covered (show FR-011 message)
- `rows.length > 0` AND some `toBuy > 0` → normal list display

---

## SQL Queries

### Main aggregation (`SHOPPING_LIST_SQL`)

```sql
SELECT
  m.id            AS material_id,
  m.name          AS material_name,
  m.unit,
  m.current_stock,
  SUM(rl.qty_per_piece * CAST(p.quantity AS REAL)) AS total_required
FROM orders o
JOIN products p      ON p.order_id    = o.id
JOIN recipe_lines rl ON rl.template_id = p.template_id
JOIN materials m     ON m.id           = rl.material_id
WHERE (
  (o.event_date    >= :today AND o.event_date    <= :cutoff)
  OR
  (o.delivery_date >= :today AND o.delivery_date <= :cutoff)
)
AND p.status IN ('de_realizat', 'in_realizare')
AND rl.qty_per_piece > 0
GROUP BY m.id
ORDER BY m.name ASC
```

**Join semantics**: All joins are INNER — this naturally excludes ad-hoc products and templates with no recipe.

---

### Excluded product count (`EXCLUDED_COUNT_SQL`)

```sql
SELECT COUNT(*) AS excluded_count
FROM orders o
JOIN products p ON p.order_id = o.id
WHERE (
  (o.event_date    >= :today AND o.event_date    <= :cutoff)
  OR
  (o.delivery_date >= :today AND o.delivery_date <= :cutoff)
)
AND p.status IN ('de_realizat', 'in_realizare')
AND (
  p.template_id IS NULL
  OR NOT EXISTS (
    SELECT 1 FROM recipe_lines rl
    WHERE rl.template_id = p.template_id AND rl.qty_per_piece > 0
  )
)
```

---

## Index Coverage

Existing indexes that cover the query access patterns:

| Index | Table | Columns | Covers |
|-------|-------|---------|--------|
| `idx_products_order_id` | `products` | `order_id` | JOIN from orders |
| `idx_products_status` | `products` | `status` | `status IN (...)` filter |
| `idx_recipe_lines_template` | `recipe_lines` | `template_id` | JOIN from products |
| `idx_recipe_lines_unique` | `recipe_lines` | `(template_id, material_id)` | UNIQUE constraint |
| `idx_materials_name` | `materials` | `name` | ORDER BY m.name ASC |

No new indexes needed. The `event_date` / `delivery_date` columns on `orders` are not indexed; with ≤100 qualifying orders this is acceptable (full scan is fast on SQLite at this scale).
