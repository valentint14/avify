# Data Model: Client Design Approval Portal (015)

## New Tables

### `approval_tokens`

Stores one row per approval campaign. The `id` is the UUID used in the public URL `/aprobare/[id]`.

| Column       | Type | Constraints                                        | Description                      |
|--------------|------|----------------------------------------------------|----------------------------------|
| `id`         | TEXT | NOT NULL PRIMARY KEY                               | UUID; slug used in the URL       |
| `order_id`   | TEXT | NOT NULL REFERENCES orders(id) ON DELETE CASCADE   | The order being reviewed         |
| `created_at` | TEXT | NOT NULL                                           | ISO 8601 timestamp               |

**Index**: `idx_approval_tokens_order ON approval_tokens (order_id)`

**Constraint notes**:
- `ON DELETE CASCADE`: deleting an order removes its approval token(s) and, transitively, all product approvals.
- No uniqueness constraint on `order_id` — multiple tokens per order are allowed (e.g., re-sending a new link), though the UI generates only one.

---

### `product_approvals`

Stores one row per product that a client has approved, scoped to a specific approval token.

| Column        | Type | Constraints                                                   | Description                          |
|---------------|------|---------------------------------------------------------------|--------------------------------------|
| `id`          | TEXT | NOT NULL PRIMARY KEY                                          | UUID                                 |
| `token_id`    | TEXT | NOT NULL REFERENCES approval_tokens(id) ON DELETE CASCADE     | Which approval session               |
| `product_id`  | TEXT | NOT NULL REFERENCES products(id) ON DELETE CASCADE            | Which product was approved           |
| `approved_at` | TEXT | NOT NULL                                                      | ISO 8601 timestamp of approval click |

**Index**: `idx_product_approvals_token ON product_approvals (token_id)`

**Unique constraint**: `UNIQUE(token_id, product_id)` — enforces idempotency; a product can only be approved once per token session (FR-012). Implemented via `INSERT OR IGNORE`.

**Constraint notes**:
- `ON DELETE CASCADE` on `token_id`: deleting a token removes all its product approvals.
- `ON DELETE CASCADE` on `product_id`: deleting a product removes its approval records.

---

## Existing Tables Modified

### `products` — No schema change

The `products.graphic_file_path` column (added in feature 012) provides the file path displayed on the approval page. No new columns needed.

### `orders` — No schema change

The `orders.name` and `orders.client` columns are displayed as the page title on the approval page. No new columns needed.

---

## Entity Relationships

```
orders (1) ──< approval_tokens (1..N)
approval_tokens (1) ──< product_approvals (0..N)
products (1) ──< product_approvals (0..N)
orders (1) ──< products (0..N)   [existing]
```

---

## Key Queries

### Fetch approval page data (given token UUID)

```sql
-- Step 1: Resolve token to order
SELECT at.id AS token_id, o.id AS order_id, o.name AS order_name, o.client
FROM approval_tokens at
JOIN orders o ON o.id = at.order_id
WHERE at.id = :tokenId;

-- Step 2: Get products for the order with their approval status
SELECT
  p.id,
  p.name,
  p.quantity,
  p.graphic_file_path,
  CASE WHEN pa.id IS NOT NULL THEN 1 ELSE 0 END AS approved
FROM products p
LEFT JOIN product_approvals pa ON pa.product_id = p.id AND pa.token_id = :tokenId
WHERE p.order_id = :orderId
ORDER BY p.created_at ASC;
```

### Record product approval (idempotent)

```sql
INSERT OR IGNORE INTO product_approvals (id, token_id, product_id, approved_at)
VALUES (:id, :tokenId, :productId, :now);
```

### Get approval status map for internal order view

```sql
SELECT pa.product_id
FROM product_approvals pa
JOIN approval_tokens at ON at.id = pa.token_id
WHERE at.order_id = :orderId;
```

Returns the set of approved product IDs for any token linked to the order.

---

## DB Migration

Both tables are added via `CREATE TABLE IF NOT EXISTS` inside `openDb()` in `src/lib/db.js`, consistent with the existing migration pattern:

```sql
CREATE TABLE IF NOT EXISTS approval_tokens (
  id         TEXT NOT NULL PRIMARY KEY,
  order_id   TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_approval_tokens_order ON approval_tokens (order_id);

CREATE TABLE IF NOT EXISTS product_approvals (
  id          TEXT NOT NULL PRIMARY KEY,
  token_id    TEXT NOT NULL REFERENCES approval_tokens(id) ON DELETE CASCADE,
  product_id  TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  approved_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_approvals_unique ON product_approvals (token_id, product_id);
CREATE INDEX IF NOT EXISTS idx_product_approvals_token ON product_approvals (token_id);
```

These statements are appended to the `SCHEMA` constant in `src/lib/db.js`.
