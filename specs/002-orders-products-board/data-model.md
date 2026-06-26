# Data Model: Orders & Products Board

## Overview

Two persisted entities: **Order** (Comandă) and **Product** (Produs).
Order status is derived at query time — not stored. Products carry the canonical state.

---

## Entity: Order (Comenzi)

Represents a client engagement (wedding, baptism, etc.). Functions as a JIRA Story.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | UUID v4 generated at creation |
| `name` | TEXT | NOT NULL | Order name / client identifier |
| `created_at` | TEXT | NOT NULL | ISO 8601 UTC timestamp |

**Derived attribute** (computed at query time, not stored):

| Attribute | Type | Derivation Rule |
|-----------|------|-----------------|
| `status` | TEXT | `'finalizata'` if `COUNT(products) > 0 AND COUNT(products WHERE status != 'gata') = 0`; otherwise `'in_progres'` |
| `product_count` | INTEGER | Total number of products in this order |
| `done_count` | INTEGER | Count of products with `status = 'gata'` |

**Note on existing columns**: The existing `orders` table contains legacy columns (`stage`,
`primary_name`, `event_type`, `product_types`, `payment_status`, `event_date`, etc.) from
the 001-kanban-orders implementation. These columns are retained in the database but are not
read or written by the new UI. New orders created via the new API will only populate `id`,
`name`, and `created_at`.

---

## Entity: Product (Produse)

Represents a single stationery item within an order. Functions as a JIRA Sub-task.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | UUID v4 generated at creation |
| `order_id` | TEXT | NOT NULL, FK → orders(id) ON DELETE CASCADE | Parent order |
| `name` | TEXT | NOT NULL | Product name (e.g., "Invitații", "Meniu") |
| `status` | TEXT | NOT NULL DEFAULT 'de_facut', CHECK (status IN (...)) | Current column |
| `created_at` | TEXT | NOT NULL | ISO 8601 UTC timestamp |

**Valid status values** (maps directly to Kanban column):

| Status ID | Display Label | Position |
|-----------|--------------|----------|
| `de_facut` | De făcut | 1 |
| `in_design` | În Design | 2 |
| `validare_client` | Validare Client | 3 |
| `printare` | Printare | 4 |
| `asamblare` | Asamblare | 5 |
| `gata` | Gata | 6 (terminal — triggers order auto-completion) |

---

## SQLite DDL (additions to existing schema)

```sql
CREATE TABLE IF NOT EXISTS products (
  id         TEXT NOT NULL PRIMARY KEY,
  order_id   TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'de_facut'
             CHECK (status IN (
               'de_facut', 'in_design', 'validare_client',
               'printare', 'asamblare', 'gata'
             )),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_order_id ON products (order_id);
CREATE INDEX IF NOT EXISTS idx_products_status   ON products (status);
```

**Note**: The `orders` table DDL is not modified. `node:sqlite`'s `CREATE TABLE IF NOT EXISTS`
ensures this block is safe to re-run on an existing database.

---

## Derived Status SQL

Used in `GET /api/orders` to return status and counts without a separate query per order:

```sql
SELECT
  o.id,
  o.name,
  o.created_at,
  COUNT(p.id)                                        AS product_count,
  COUNT(CASE WHEN p.status = 'gata' THEN 1 END)     AS done_count,
  CASE
    WHEN COUNT(p.id) > 0
     AND COUNT(CASE WHEN p.status != 'gata' THEN 1 END) = 0
    THEN 'finalizata'
    ELSE 'in_progres'
  END                                                AS status
FROM orders o
LEFT JOIN products p ON p.order_id = o.id
GROUP BY o.id
ORDER BY o.created_at DESC;
```

---

## State Transitions

### Product status transitions (all transitions allowed)

```
de_facut ←→ in_design ←→ validare_client ←→ printare ←→ asamblare ←→ gata
```

Products can move freely in both directions between any two columns (no enforced sequence).

### Order status transitions (fully derived)

```
in_progres ──(all products reach 'gata')──→ finalizata
finalizata ──(any product moves out of 'gata' OR new product added)──→ in_progres
```

Order status transitions are side-effects of product mutations, not direct API calls.

---

## Validation Rules

| Rule | Scope | Detail |
|------|-------|--------|
| Order name required | Create | `name` must be a non-empty string after trimming |
| Product name required | Create | `name` must be a non-empty string after trimming |
| Valid product status | Update | `status` must be one of the 6 valid values |
| Order must exist | Create product | `order_id` must reference an existing order row |
| Cascade delete | Delete order | All products with matching `order_id` are deleted automatically |

---

## Entity Relationships

```
orders (1) ──< (many) products
  └── id ←── order_id
              └── ON DELETE CASCADE
```

One order has zero or more products. A product belongs to exactly one order.
