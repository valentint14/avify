# Data Model: Catalog Produse

## SQLite Schema Changes

### New Table: `product_templates`

```sql
CREATE TABLE IF NOT EXISTS product_templates (
  id          TEXT NOT NULL PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_product_templates_name ON product_templates (name);
```

**Fields**:

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PK, NOT NULL | UUID v4 generated server-side |
| `name` | TEXT | NOT NULL | Template display name (e.g., "Invitație clasică"). Not enforced unique at DB level — duplicates are allowed. |
| `description` | TEXT | nullable | Optional short description |
| `created_at` | TEXT | NOT NULL | ISO 8601 UTC timestamp |

**Index**: `idx_product_templates_name` on `name` supports LIKE-based search in the catalog selector.

---

### Modified Table: `products` (additive migration)

**New column added**:

```sql
ALTER TABLE products ADD COLUMN template_id TEXT REFERENCES product_templates(id) ON DELETE SET NULL;
```

Added via a conditional check at startup (`PRAGMA table_info(products)` → if `template_id` absent, run `ALTER TABLE`).

**Updated field table**:

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PK, NOT NULL | (existing) |
| `order_id` | TEXT | NOT NULL, FK → orders.id ON DELETE CASCADE | (existing) |
| `name` | TEXT | NOT NULL | (existing) Copied from template at creation time |
| `status` | TEXT | NOT NULL, CHECK | (existing) |
| `created_at` | TEXT | NOT NULL | (existing) |
| `template_id` | TEXT | nullable, FK → product_templates.id ON DELETE SET NULL | **NEW** — links product to its catalog source; NULL for ad-hoc products |

---

## Entity Definitions

### ProductTemplate

Represents a reusable product definition stored in the catalog.

```
ProductTemplate {
  id:          string   // UUID
  name:        string   // required; user-visible label
  description: string?  // optional; shown in catalog list and selector tooltip
  createdAt:   string   // ISO 8601
}
```

**Invariants**:
- `name` must not be empty (enforced at API layer).
- Deletion does not cascade to `products` — existing products retain their `name` and lose the `template_id` FK (SET NULL).

---

### Product (updated)

```
Product {
  id:         string
  orderId:    string
  name:       string
  status:     'de_facut' | 'in_design' | 'validare_client' | 'printare' | 'asamblare' | 'gata'
  templateId: string?   // NEW — null for ad-hoc products
  createdAt:  string
}
```

---

### Order (unchanged)

```
Order {
  id:           string
  name:         string
  status:       'in_progres' | 'finalizata'   // derived via SQL subquery
  productCount: number
  doneCount:    number
  createdAt:    string
}
```

---

## Entity Relationships

```
product_templates  ──0..N──▶  products  ──N..1──▶  orders
     (template_id, nullable FK, ON DELETE SET NULL)
                              (order_id, NOT NULL FK, ON DELETE CASCADE)
```

- One `ProductTemplate` can be used in many `products` (even multiple times in the same order).
- Deleting a `ProductTemplate` sets `products.template_id = NULL` on all referencing rows.
- Deleting an `Order` cascades to delete all its `products`.

---

## Migration Strategy

`src/lib/db.js` `SCHEMA` string is extended with the `product_templates` DDL (idempotent via `CREATE TABLE IF NOT EXISTS`).

After `db.exec(SCHEMA)`, a conditional migration runs:

```js
const cols = db.prepare("PRAGMA table_info(products)").all();
if (!cols.some(c => c.name === 'template_id')) {
  db.exec("ALTER TABLE products ADD COLUMN template_id TEXT REFERENCES product_templates(id) ON DELETE SET NULL");
}
```

This runs once on app start and is a no-op on subsequent starts once the column exists.
