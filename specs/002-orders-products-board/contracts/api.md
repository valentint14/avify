# API Contract: Orders & Products Board

Base URL: `http://localhost:3000/api`

All request and response bodies are JSON (`Content-Type: application/json`).
All timestamps are ISO 8601 UTC strings (e.g., `"2026-06-26T10:00:00.000Z"`).

---

## Orders

### GET /api/orders

Returns all orders with derived status and product summary. No request body.

**Response 200**:
```json
{
  "orders": [
    {
      "id": "abc-123",
      "name": "Nuntă Popescu",
      "status": "in_progres",
      "productCount": 5,
      "doneCount": 3,
      "createdAt": "2026-06-26T10:00:00.000Z"
    },
    {
      "id": "def-456",
      "name": "Botez Maria",
      "status": "finalizata",
      "productCount": 2,
      "doneCount": 2,
      "createdAt": "2026-06-25T08:30:00.000Z"
    }
  ]
}
```

**Status values**:
- `"in_progres"` — order has no products, or at least one product is not in `"gata"`
- `"finalizata"` — order has ≥1 products and all are in `"gata"`

---

### POST /api/orders

Creates a new order. New orders have zero products and start with `status: "in_progres"`.

**Request body**:
```json
{
  "name": "Nuntă Ionescu"
}
```

**Validation**:
- `name`: required, non-empty string after trimming

**Response 201**:
```json
{
  "order": {
    "id": "ghi-789",
    "name": "Nuntă Ionescu",
    "status": "in_progres",
    "productCount": 0,
    "doneCount": 0,
    "createdAt": "2026-06-26T11:00:00.000Z"
  }
}
```

**Response 400** (validation failure):
```json
{
  "error": "Numele comenzii este obligatoriu."
}
```

---

### DELETE /api/orders/:id

Deletes an order and all its products (cascade).

**Response 200**:
```json
{
  "deleted": true
}
```

**Response 404** (order not found):
```json
{
  "error": "Comanda nu a fost găsită."
}
```

---

## Products

### GET /api/products?orderId=:orderId

Returns all products for a specific order, grouped by status column.

**Query parameter**: `orderId` — required

**Response 200**:
```json
{
  "products": [
    {
      "id": "p-001",
      "orderId": "abc-123",
      "name": "Invitații",
      "status": "printare",
      "createdAt": "2026-06-26T10:05:00.000Z"
    },
    {
      "id": "p-002",
      "orderId": "abc-123",
      "name": "Meniu",
      "status": "gata",
      "createdAt": "2026-06-26T10:06:00.000Z"
    }
  ]
}
```

**Response 400** (missing orderId):
```json
{
  "error": "Parametrul orderId este obligatoriu."
}
```

---

### POST /api/products

Creates a new product within an order. New products always start in `"de_facut"`.

**Request body**:
```json
{
  "orderId": "abc-123",
  "name": "Program"
}
```

**Validation**:
- `orderId`: required, must reference an existing order
- `name`: required, non-empty string after trimming

**Response 201**:
```json
{
  "product": {
    "id": "p-003",
    "orderId": "abc-123",
    "name": "Program",
    "status": "de_facut",
    "createdAt": "2026-06-26T12:00:00.000Z"
  }
}
```

**Response 400** (validation failure):
```json
{
  "error": "Numele produsului este obligatoriu."
}
```

**Response 404** (order not found):
```json
{
  "error": "Comanda nu a fost găsită."
}
```

---

### PATCH /api/products/:id

Updates the status (column) of a product. This is the primary drag-and-drop mutation.

**Request body**:
```json
{
  "status": "asamblare"
}
```

**Valid status values**: `de_facut`, `in_design`, `validare_client`, `printare`, `asamblare`, `gata`

**Response 200**:
```json
{
  "product": {
    "id": "p-001",
    "orderId": "abc-123",
    "name": "Invitații",
    "status": "asamblare",
    "createdAt": "2026-06-26T10:05:00.000Z"
  }
}
```

**Response 400** (invalid status):
```json
{
  "error": "Status invalid."
}
```

**Response 404** (product not found):
```json
{
  "error": "Produsul nu a fost găsit."
}
```

---

### DELETE /api/products/:id

Deletes a single product.

**Response 200**:
```json
{
  "deleted": true
}
```

**Response 404** (product not found):
```json
{
  "error": "Produsul nu a fost găsit."
}
```

---

## Error Format (all endpoints)

All error responses follow this shape:

```json
{
  "error": "<human-readable Romanian message>"
}
```

HTTP status codes used:
- `200` — success (GET, PATCH, DELETE)
- `201` — resource created (POST)
- `400` — client validation error (missing/invalid field)
- `404` — resource not found
- `500` — unexpected server error (generic message, no stack trace)
