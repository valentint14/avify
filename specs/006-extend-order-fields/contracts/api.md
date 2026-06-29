# API Contracts: Extend Order Fields & Auto-Calculated Totals

**Feature**: 006-extend-order-fields
**Date**: 2026-06-29

All endpoints follow the existing JSON REST conventions in the project. Errors are always `{ "error": "<message>" }`.

---

## Orders

### GET /api/orders

Returns all orders with computed status and total.

**Response 200**

```json
{
  "orders": [
    {
      "id": "uuid",
      "name": "Nuntă Popescu",
      "status": "in_progres",
      "productCount": 3,
      "doneCount": 1,
      "total": 390.00,
      "client": "Maria Ionescu",
      "receptionDate": "2026-07-01",
      "advance": 500.00,
      "county": "Cluj",
      "contactPlatform": "Facebook",
      "eventDate": "2026-08-15",
      "deliveryDate": "2026-08-10",
      "profit": 150.00,
      "collected": false,
      "delivered": false,
      "createdAt": "2026-06-29T10:00:00.000Z"
    }
  ]
}
```

**New fields vs. existing**: `total`, `client`, `receptionDate`, `advance`, `county`, `contactPlatform`, `eventDate`, `deliveryDate`, `profit`, `collected`, `delivered` are all new. All other fields are unchanged.

---

### POST /api/orders

Creates a new order. All new fields are optional.

**Request body**

```json
{
  "name": "Nuntă Popescu",
  "templateIds": ["uuid1", "uuid2"],
  "client": "Maria Ionescu",
  "receptionDate": "2026-07-01",
  "advance": 500,
  "county": "Cluj",
  "contactPlatform": "Facebook",
  "eventDate": "2026-08-15",
  "deliveryDate": "2026-08-10",
  "profit": 150,
  "collected": false,
  "delivered": false
}
```

**Response 201**

```json
{
  "order": { /* same shape as GET /api/orders item */ },
  "products": [ /* array of created product objects */ ]
}
```

**Response 400** — `name` missing or blank

```json
{ "error": "Numele comenzii este obligatoriu." }
```

---

### PATCH /api/orders/[id]

Updates one or more metadata fields on an existing order. At least one field must be provided.

**Request body** (all fields optional, at least one required)

```json
{
  "client": "Maria Ionescu",
  "receptionDate": "2026-07-01",
  "advance": 500,
  "county": "Cluj",
  "contactPlatform": "Facebook",
  "eventDate": "2026-08-15",
  "deliveryDate": "2026-08-10",
  "profit": 150,
  "collected": true,
  "delivered": false
}
```

**Response 200**

```json
{
  "order": { /* updated order object, same shape as GET item */ }
}
```

**Response 400** — no recognised fields provided

```json
{ "error": "Cel puțin un câmp trebuie furnizat." }
```

**Response 404** — order not found

```json
{ "error": "Comanda nu a fost găsită." }
```

---

## Products

### PATCH /api/products/[id] (extended)

Existing endpoint extended to accept `unitPrice`. All fields remain individually optional; at least one must be present.

**New field in request body**

```json
{
  "unitPrice": 50.00
}
```

`unitPrice` must be a finite number ≥ 0 if provided.

**Response 200** — product object now includes `unitPrice`

```json
{
  "product": {
    "id": "uuid",
    "orderId": "uuid",
    "name": "Invitații",
    "status": "de_facut",
    "templateId": null,
    "quantity": 3,
    "additionalInfo": null,
    "unitPrice": 50.00,
    "createdAt": "2026-06-29T10:00:00.000Z"
  }
}
```

**Response 400** — invalid unitPrice

```json
{ "error": "Prețul unitar trebuie să fie un număr pozitiv." }
```

---

## GET /api/products (extended)

Returns product objects for a given order. Each product now includes `unitPrice`.

**Query param**: `orderId=<uuid>` (required)

**Response 200**

```json
{
  "products": [
    {
      "id": "uuid",
      "orderId": "uuid",
      "name": "Invitații",
      "status": "de_facut",
      "templateId": null,
      "quantity": 3,
      "additionalInfo": null,
      "unitPrice": 50.00,
      "createdAt": "2026-06-29T10:00:00.000Z"
    }
  ]
}
```

---

## Field Mapping: JSON ↔ Database

| JSON key | DB column | Table |
|----------|-----------|-------|
| `total` | derived: `SUM(quantity * unit_price)` | products JOIN |
| `client` | `client` | orders |
| `receptionDate` | `reception_date` | orders |
| `advance` | `advance` | orders |
| `county` | `county` | orders |
| `contactPlatform` | `contact_platform` | orders |
| `eventDate` | `event_date` | orders |
| `deliveryDate` | `delivery_date` | orders |
| `profit` | `profit` | orders |
| `collected` | `collected` | orders |
| `delivered` | `delivered` | orders |
| `unitPrice` | `unit_price` | products |
