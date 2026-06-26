# Data Model: Kanban Board for Stationery Order Management

**Feature**: `001-kanban-orders`
**Date**: 2026-06-25
**See also**: [contracts/api.md](contracts/api.md), [spec.md](spec.md)

---

## SQLite Schema

### Table: `orders`

```sql
CREATE TABLE IF NOT EXISTS orders (
  id               TEXT    PRIMARY KEY,
  primary_name     TEXT    NOT NULL,
  secondary_name   TEXT,
  event_date       TEXT    NOT NULL,
  event_type       TEXT    NOT NULL
                   CHECK (event_type IN ('nunta', 'botez')),
  product_types    TEXT    NOT NULL,
  payment_status   TEXT    NOT NULL
                   CHECK (payment_status IN ('neachitat', 'avans_achitat', 'achitat_integral')),
  stage            TEXT    NOT NULL DEFAULT 'de_facut'
                   CHECK (stage IN ('de_facut', 'in_design', 'validare_client',
                                    'printare', 'asamblare', 'livrat')),
  notes            TEXT,
  created_at       TEXT    NOT NULL,
  updated_at       TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_stage       ON orders (stage);
CREATE INDEX IF NOT EXISTS idx_orders_event_date  ON orders (event_date);
CREATE INDEX IF NOT EXISTS idx_orders_payment     ON orders (payment_status);
```

**Field notes**:
- `id`: UUID string generated via `crypto.randomUUID()` server-side.
- `event_date`: Stored as `YYYY-MM-DD` text (ISO 8601 date). SQLite text comparison
  works correctly for ISO date strings.
- `product_types`: Stored as a JSON array string, e.g. `'["Invitații","Meniu"]'`.
  Parsed to an array when returned from the API.
- `created_at` / `updated_at`: Stored as ISO 8601 datetime strings
  (`new Date().toISOString()`).

### Table: `product_types`

```sql
CREATE TABLE IF NOT EXISTS product_types (
  id        TEXT    PRIMARY KEY,
  name      TEXT    NOT NULL UNIQUE,
  is_custom INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO product_types (id, name, is_custom) VALUES
  ('pt-1', 'Invitații',         0),
  ('pt-2', 'Meniu',             0),
  ('pt-3', 'Program',           0),
  ('pt-4', 'Plăcuțe de masă',   0),
  ('pt-5', 'Plic',              0),
  ('pt-6', 'Semn de bun venit', 0),
  ('pt-7', 'Altele',            0);
```

**Field notes**:
- `is_custom`: `0` = system default (seeded); `1` = user-added via the UI.
- System product types cannot be deleted.

---

## Enumerations

### WorkflowStage

| DB Identifier       | Display Name (RO)  | Column Position |
|---------------------|--------------------|-----------------|
| `de_facut`          | De făcut           | 1               |
| `in_design`         | În design          | 2               |
| `validare_client`   | Validare client    | 3               |
| `printare`          | Printare           | 4               |
| `asamblare`         | Asamblare          | 5               |
| `livrat`            | Livrat             | 6               |

Stages are system-defined and immutable. The sequence is fixed; movement in both
directions is permitted.

### PaymentStatus

| DB Identifier        | Display Name (RO)  | Badge Color Suggestion |
|----------------------|--------------------|------------------------|
| `neachitat`          | Neachitat          | Red (`--color-danger`) |
| `avans_achitat`      | Avans achitat      | Amber (`--color-warn`) |
| `achitat_integral`   | Achitat integral   | Green (`--color-ok`)   |

### EventType

| DB Identifier | Display Name (RO) |
|---------------|-------------------|
| `nunta`       | Nuntă             |
| `botez`       | Botez             |

---

## JavaScript Entity Shapes

### Order (API response / client state)

```js
{
  id:             string,          // UUID
  primaryName:    string,          // Required; max 100 chars
  secondaryName:  string | null,   // Optional; max 100 chars
  eventDate:      string,          // "YYYY-MM-DD"
  eventType:      "nunta" | "botez",
  productTypes:   string[],        // Non-empty array of product type names
  paymentStatus:  "neachitat" | "avans_achitat" | "achitat_integral",
  stage:          "de_facut" | "in_design" | "validare_client"
                | "printare" | "asamblare" | "livrat",
  notes:          string | null,   // Optional; max 1000 chars
  createdAt:      string,          // ISO datetime
  updatedAt:      string,          // ISO datetime
}
```

**DB → JS column mapping** (applied in `src/lib/orders.js`):

| SQLite column    | JS property     | Transform                            |
|------------------|-----------------|--------------------------------------|
| `primary_name`   | `primaryName`   | direct                               |
| `secondary_name` | `secondaryName` | direct (null if absent)              |
| `event_date`     | `eventDate`     | direct                               |
| `event_type`     | `eventType`     | direct                               |
| `product_types`  | `productTypes`  | `JSON.parse(row.product_types)`      |
| `payment_status` | `paymentStatus` | direct                               |
| `created_at`     | `createdAt`     | direct                               |
| `updated_at`     | `updatedAt`     | direct                               |

### ProductType

```js
{
  id:       string,
  name:     string,
  isCustom: boolean,   // false = system default, true = user-added
}
```

---

## Validation Rules

| Field           | Rule                                                                 |
|-----------------|----------------------------------------------------------------------|
| `primaryName`   | Required; non-empty string; max 100 characters                       |
| `secondaryName` | Optional; if present, non-empty string; max 100 characters           |
| `eventDate`     | Required; valid ISO date (YYYY-MM-DD)                                |
| `eventType`     | Required; must be `nunta` or `botez`                                 |
| `productTypes`  | Required; non-empty array; each item must be a known product type    |
| `paymentStatus` | Required; must be a valid PaymentStatus identifier                   |
| `stage`         | Optional on create (defaults to `de_facut`); must be valid if given  |
| `notes`         | Optional; max 1000 characters                                        |

Validation is enforced in the API route handlers before any database write.
Error responses use human-readable Romanian messages.

---

## Card Sort Order

Within each Kanban column, orders are sorted:

1. **Primary**: `event_date ASC` — soonest upcoming event at the top of the column.
2. **Secondary**: `created_at ASC` — FIFO tie-break for orders sharing the same event date.

Sorting is applied by the `getAll` query function in `src/lib/orders.js` and is stable
across all API responses.
