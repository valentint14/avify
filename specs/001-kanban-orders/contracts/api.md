# API Contract: Kanban Board for Stationery Order Management

**Feature**: `001-kanban-orders`
**Date**: 2026-06-25
**Base URL**: `http://localhost:3000/api`
**Format**: `application/json`
**Authentication**: None

---

## Data Types

See [data-model.md](../data-model.md) for field definitions, enumerations, and validation rules.

**Order object**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "primaryName": "Andrei Popescu",
  "secondaryName": "Maria Popescu",
  "eventDate": "2026-08-15",
  "eventType": "nunta",
  "productTypes": ["Invitații", "Meniu"],
  "paymentStatus": "avans_achitat",
  "stage": "in_design",
  "notes": null,
  "createdAt": "2026-06-25T10:00:00.000Z",
  "updatedAt": "2026-06-25T11:30:00.000Z"
}
```

---

## Orders

### `GET /api/orders`

Return all orders, optionally filtered. Orders are sorted by `eventDate ASC`,
then `createdAt ASC` within each stage. The full list is returned regardless of
stage; client-side rendering splits cards into columns.

**Query parameters** (all optional):

| Parameter         | Type   | Example        | Description                               |
|-------------------|--------|----------------|-------------------------------------------|
| `payment_status`  | string | `neachitat`    | Exact match on paymentStatus              |
| `event_date_from` | string | `2026-06-01`   | Include orders with eventDate ≥ this date |
| `event_date_to`   | string | `2026-06-30`   | Include orders with eventDate ≤ this date |

**Response `200`**:
```json
{
  "orders": [ { ...Order }, ... ]
}
```

---

### `POST /api/orders`

Create a new order. The `stage` field defaults to `de_facut` if omitted.

**Request body**:
```json
{
  "primaryName": "Andrei Popescu",
  "secondaryName": "Maria Popescu",
  "eventDate": "2026-08-15",
  "eventType": "nunta",
  "productTypes": ["Invitații", "Meniu"],
  "paymentStatus": "neachitat",
  "notes": "Livrare la sediu joi"
}
```

**Response `201`**:
```json
{ "order": { ...Order } }
```

**Response `400`** (validation error):
```json
{ "error": "Numele clientului este obligatoriu." }
```

---

### `GET /api/orders/:id`

Retrieve a single order by ID.

**Response `200`**: `{ "order": { ...Order } }`

**Response `404`**: `{ "error": "Comanda nu a fost găsită." }`

---

### `PUT /api/orders/:id`

Update one or more fields of an existing order. All body fields are optional;
only the provided fields are updated. `updatedAt` is set automatically.

Used for both detail edits (field changes) and stage moves (updating `stage` only).

**Request body** (all fields optional):
```json
{
  "primaryName": "Andrei Popescu",
  "secondaryName": null,
  "eventDate": "2026-08-20",
  "eventType": "nunta",
  "productTypes": ["Invitații"],
  "paymentStatus": "achitat_integral",
  "stage": "printare",
  "notes": null
}
```

**Response `200`**: `{ "order": { ...Order } }`

**Response `404`**: `{ "error": "Comanda nu a fost găsită." }`

**Response `400`**: `{ "error": "..." }`

---

### `DELETE /api/orders/:id`

Permanently delete an order. This action cannot be undone.

**Response `200`**: `{ "success": true }`

**Response `404`**: `{ "error": "Comanda nu a fost găsită." }`

---

## Product Types

### `GET /api/product-types`

Return all product types: system defaults and user-created custom types.

**Response `200`**:
```json
{
  "productTypes": [
    { "id": "pt-1", "name": "Invitații",         "isCustom": false },
    { "id": "pt-2", "name": "Meniu",             "isCustom": false },
    { "id": "pt-3", "name": "Program",           "isCustom": false },
    { "id": "pt-4", "name": "Plăcuțe de masă",   "isCustom": false },
    { "id": "pt-5", "name": "Plic",              "isCustom": false },
    { "id": "pt-6", "name": "Semn de bun venit", "isCustom": false },
    { "id": "pt-7", "name": "Altele",            "isCustom": false }
  ]
}
```

---

### `POST /api/product-types`

Add a new custom product type. System defaults cannot be duplicated.

**Request body**: `{ "name": "Felicitări" }`

**Response `201`**:
```json
{ "productType": { "id": "uuid", "name": "Felicitări", "isCustom": true } }
```

**Response `400`** (duplicate or missing name):
```json
{ "error": "Tipul de produs există deja." }
```

---

## Error Format

All error responses follow a single shape:

```json
{ "error": "Human-readable error message in Romanian." }
```

**HTTP status codes used**:

| Code | When                                               |
|------|----------------------------------------------------|
| 200  | Successful GET, PUT, DELETE                        |
| 201  | Successful POST (resource created)                 |
| 400  | Validation error or bad request body               |
| 404  | Resource not found                                 |
| 500  | Unexpected server error (message: "Eroare internă de server.") |
