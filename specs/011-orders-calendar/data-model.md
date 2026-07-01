# Data Model: Orders Calendar

## Existing Entities Used (No Schema Changes)

### Order (existing table: `orders`)

Fields used by the Calendar feature:

| Field             | DB Column          | Type    | Notes |
|-------------------|--------------------|---------|-------|
| `id`              | `id`               | TEXT    | UUID primary key |
| `name`            | `name`             | TEXT    | Order display name |
| `client`          | `client`           | TEXT    | Client full name (nullable) |
| `county`          | `county`           | TEXT    | Romanian county (nullable) |
| `contactPlatform` | `contact_platform` | TEXT    | WhatsApp / Instagram / Email etc. (nullable) |
| `eventDate`       | `event_date`       | TEXT    | ISO date YYYY-MM-DD (nullable) |
| `deliveryDate`    | `delivery_date`    | TEXT    | ISO date YYYY-MM-DD (nullable) |
| `advance`         | `advance`          | REAL    | Advance payment amount |
| `profit`          | `profit`           | REAL    | Profit amount |
| `collected`       | `collected`        | INTEGER | 0/1 boolean |
| `delivered`       | `delivered`        | INTEGER | 0/1 boolean |

Already returned by `getAllWithStatus()` in `src/lib/orders.js` as camelCase parsed JS objects.

### Product (existing table: `products`)

Fields used by the Calendar dialog:

| Field       | DB Column    | Type    | Notes |
|-------------|--------------|---------|-------|
| `id`        | `id`         | TEXT    | UUID primary key |
| `orderId`   | `order_id`   | TEXT    | Foreign key → orders.id |
| `name`      | `name`       | TEXT    | Product name |
| `status`    | `status`     | TEXT    | One of: de_facut / in_design / validare_client / printare / asamblare / gata |
| `quantity`  | `quantity`   | INTEGER | Number of units |
| `unitPrice` | `unit_price` | REAL    | Price per unit |

Already returned by `getProductsByOrder(orderId)` in `src/lib/products.js`.

---

## Derived View Objects (Computed at Render, Not Stored)

### CalendarEvent

Computed in the CalendarGrid component from the raw orders array. Not persisted anywhere.

```
CalendarEvent {
  order:     Order        // full order object (from getAllWithStatus)
  date:      string       // ISO date "YYYY-MM-DD" — the specific date this event falls on
  type:      "eveniment"  // sourced from order.eventDate
          | "livrare"     // sourced from order.deliveryDate
}
```

**Derivation rules**:
- For each order where `eventDate` is non-null → create a `CalendarEvent` with `type: "eveniment"` and `date: order.eventDate`
- For each order where `deliveryDate` is non-null → create a `CalendarEvent` with `type: "livrare"` and `date: order.deliveryDate`
- An order can produce 0, 1, or 2 CalendarEvents depending on which date fields are set
- Both events for the same order are independent and link back to the same order object

### CalendarDay

One per day cell in the monthly grid. Also derived, not stored.

```
CalendarDay {
  date:       string       // ISO date "YYYY-MM-DD"
  dayNumber:  number       // 1–31
  isCurrentMonth: boolean  // false for padding days from prev/next month
  isToday:    boolean
  events:     CalendarEvent[]  // all events whose date matches this day
}
```

---

## Data Access Patterns

| Operation | Source | Notes |
|-----------|--------|-------|
| Load all orders for calendar | `getAllWithStatus()` | Called once on RSC page render; includes all order metadata |
| Load products for a clicked order | `GET /api/products?orderId=xxx` | Lazy, on dialog open only |

No new queries, routes, or lib functions required.

---

## Entity Relationships (Relevant Subset)

```
Order 1──────────────────────── * Product
  │ (event_date)                    (name, status, quantity, unit_price)
  │ (delivery_date)
  │
  └── 0, 1, or 2 CalendarEvents (derived)
        └── placed on a CalendarDay (derived)
```
