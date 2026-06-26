# Data Model: Order Product Details (Quantity & Notes)

## Existing Entities (unchanged)

### `orders`
| Column | Type | Constraints |
|--------|------|-------------|
| id | TEXT | PRIMARY KEY |
| name | TEXT | NOT NULL |
| created_at | TEXT | NOT NULL (ISO 8601) |

### `product_templates`
| Column | Type | Constraints |
|--------|------|-------------|
| id | TEXT | PRIMARY KEY |
| name | TEXT | NOT NULL |
| description | TEXT | nullable |
| created_at | TEXT | NOT NULL |

---

## Modified Entity: `products`

Two new columns added via `ALTER TABLE` in `openDb()` startup migration.

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| id | TEXT | PRIMARY KEY | — | UUID |
| order_id | TEXT | NOT NULL, FK → orders(id) ON DELETE CASCADE | — | |
| name | TEXT | NOT NULL | — | Copied from template at creation |
| status | TEXT | NOT NULL, CHECK(enum) | `'de_facut'` | 6 valid stages |
| template_id | TEXT | FK → product_templates(id) ON DELETE SET NULL | NULL | nullable for manual products |
| **quantity** | **INTEGER** | **NOT NULL** | **1** | **Positive integer ≥ 1** |
| **additional_info** | **TEXT** | **nullable** | **NULL** | **Free text; no hard length limit** |
| created_at | TEXT | NOT NULL | — | ISO 8601 |

### New Index

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_order_template
  ON products (order_id, template_id)
  WHERE template_id IS NOT NULL;
```

Enforces: a catalog product (non-null `template_id`) may appear at most once per order.

### Validation Rules

| Field | Rule | Enforced at |
|-------|------|-------------|
| quantity | Integer ≥ 1 | DB DEFAULT + API layer (explicit check) |
| additional_info | Any string or NULL | API layer (no sanitization beyond trim) |
| (order_id, template_id) | Unique when template_id IS NOT NULL | DB partial unique index |

---

## Runtime Model (JavaScript)

What `parseRow()` in `src/lib/products.js` returns after this feature:

```js
{
  id: string,            // UUID
  orderId: string,       // parent order UUID
  name: string,          // product name
  status: string,        // Kanban stage id
  templateId: string|null,
  quantity: number,      // positive integer, default 1
  additionalInfo: string|null,
  createdAt: string,     // ISO 8601
}
```

---

## State Transitions (unchanged)

Status flow is unchanged by this feature:

```
de_facut → in_design → validare_client → printare → asamblare → gata
```

All transitions remain drag-and-drop only. `quantity` and `additional_info` are independent of status.

---

## Entity Relationships

```
orders 1──────────* products *────────────0..1 product_templates
       (order_id FK)         (template_id FK, unique per order)
```

- An order has zero or more products.
- A product belongs to exactly one order.
- A product may reference zero or one product template (manual products have no template).
- A given template may appear at most once per order.
