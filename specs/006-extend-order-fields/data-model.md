# Data Model: Extend Order Fields & Auto-Calculated Totals

**Feature**: 006-extend-order-fields
**Date**: 2026-06-29

## Entities

### Order (extended)

Stored in `orders` table. New columns are added via `ALTER TABLE` in `src/lib/db.js`.

| Column | Type | Default | Nullable | Notes |
|--------|------|---------|----------|-------|
| `id` | TEXT | — | No | Primary key (UUID) — existing |
| `name` | TEXT | — | No | Order name — existing |
| `created_at` | TEXT | — | No | ISO 8601 timestamp — existing |
| `client` | TEXT | NULL | Yes | Client name |
| `reception_date` | TEXT | NULL | Yes | ISO 8601 date (Dată primire) |
| `advance` | REAL | 0 | Yes | Advance payment amount in RON (Avans) |
| `county` | TEXT | NULL | Yes | Romanian county (Județ) |
| `contact_platform` | TEXT | NULL | Yes | Contact channel (free text; see enum values below) |
| `event_date` | TEXT | NULL | Yes | ISO 8601 date (Dată eveniment) |
| `delivery_date` | TEXT | NULL | Yes | ISO 8601 date (Termen livrare) |
| `profit` | REAL | 0 | Yes | Profit amount in RON (manually entered) |
| `collected` | INTEGER | 0 | No | Boolean flag: 1 = collected/paid, 0 = not (Încasată) |
| `delivered` | INTEGER | 0 | No | Boolean flag: 1 = delivered, 0 = not (Livrată) |

**Derived field (not stored)**:

| Field | Derived From | Formula |
|-------|-------------|---------|
| `total` | products JOIN | `SUM(products.quantity * COALESCE(products.unit_price, 0))` computed in SQL |
| `status` | products JOIN | Existing derived field (`finalizata` / `in_progres`) |

**JavaScript object shape** (returned by `parseRow` in `orders.js`):

```js
{
  id: string,
  name: string,
  status: 'finalizata' | 'in_progres',
  productCount: number,
  doneCount: number,
  total: number,          // RON — sum of quantity × unit_price across products
  client: string | null,
  receptionDate: string | null,    // ISO date string
  advance: number,
  county: string | null,
  contactPlatform: string | null,
  eventDate: string | null,        // ISO date string
  deliveryDate: string | null,     // ISO date string
  profit: number,
  collected: boolean,
  delivered: boolean,
  createdAt: string,
}
```

---

### OrderProduct (extended)

Stored in `products` table. One new column added via `ALTER TABLE`.

| Column | Type | Default | Nullable | Notes |
|--------|------|---------|----------|-------|
| `id` | TEXT | — | No | Primary key (UUID) — existing |
| `order_id` | TEXT | — | No | FK → orders.id ON DELETE CASCADE — existing |
| `name` | TEXT | — | No | Product name — existing |
| `status` | TEXT | `'de_facut'` | No | Workflow stage — existing |
| `template_id` | TEXT | NULL | Yes | FK → product_templates.id — existing |
| `quantity` | INTEGER | 1 | No | Units ordered — existing |
| `additional_info` | TEXT | NULL | Yes | Custom notes — existing |
| `created_at` | TEXT | — | No | ISO 8601 timestamp — existing |
| `unit_price` | REAL | 0 | Yes | Price per unit in RON (Preț unitar) |

**JavaScript object shape** (returned by `parseRow` in `products.js`):

```js
{
  id: string,
  orderId: string,
  name: string,
  status: 'de_facut' | 'in_design' | 'validare_client' | 'printare' | 'asamblare' | 'gata',
  templateId: string | null,
  quantity: number,
  additionalInfo: string | null,
  unitPrice: number,      // RON — new field
  createdAt: string,
}
```

---

## Validation Rules

### Order fields

| Field | Validation |
|-------|-----------|
| `client` | Optional; any string; max 255 chars is reasonable but not enforced in DB |
| `reception_date` | Optional; must be valid ISO date string if provided |
| `advance` | Optional; must be a finite number ≥ 0 if provided; stored as REAL |
| `county` | Optional; any string |
| `contact_platform` | Optional; any string; UI offers predefined suggestions |
| `event_date` | Optional; must be valid ISO date string if provided |
| `delivery_date` | Optional; must be valid ISO date string if provided |
| `profit` | Optional; must be a finite number if provided; may be negative |
| `collected` | Boolean (coerced); defaults to false |
| `delivered` | Boolean (coerced); defaults to false |

### Product fields

| Field | Validation |
|-------|-----------|
| `unit_price` | Optional; must be a finite number ≥ 0 if provided; stored as REAL |

---

## Predefined `contact_platform` Values

The UI presents these as a `<select>` dropdown. All are stored as plain text.

- `Facebook`
- `Instagram`
- `TikTok`
- `Telefon`
- `Email`
- `Altele` (selecting "Altele" reveals a free-text input for a custom value)

---

## State Transitions

No new state machine is introduced. The existing product status workflow (`de_facut → … → gata`) is unchanged. The derived order `status` (`in_progres` / `finalizata`) is unchanged.

`collected` and `delivered` are independent boolean flags with no enforced transition rules — they can be toggled freely.

---

## Relationships

```
orders (1) ──< products (N)
  │                └── unit_price  [NEW]
  ├── client        [NEW]
  ├── reception_date [NEW]
  ├── advance        [NEW]
  ├── county         [NEW]
  ├── contact_platform [NEW]
  ├── event_date     [NEW]
  ├── delivery_date  [NEW]
  ├── profit         [NEW]
  ├── collected      [NEW]
  └── delivered      [NEW]

total = SUM(products.quantity × products.unit_price)  [DERIVED, not stored]
```
