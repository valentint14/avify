# API Contract: Catalog Produse

All endpoints return `application/json`. Error bodies: `{ "error": "<human-readable Romanian message>" }`.

---

## New Endpoints: `/api/catalog`

### `GET /api/catalog`

List all product templates, ordered by name ascending.

**Request**: No body. Optional query param `?q=<search>` filters results by name (case-insensitive LIKE `%q%`).

**Response `200`**:
```json
{
  "templates": [
    {
      "id": "uuid",
      "name": "Invitație clasică",
      "description": "Invitație standard pentru nunți",
      "createdAt": "2026-06-26T10:00:00.000Z"
    }
  ]
}
```

---

### `POST /api/catalog`

Create a new product template.

**Request body**:
```json
{
  "name": "Meniu nuntă",
  "description": "Meniu tipărit pentru masa festivă"
}
```
`name` — required, non-empty string. `description` — optional string.

**Response `201`**:
```json
{
  "template": {
    "id": "uuid",
    "name": "Meniu nuntă",
    "description": "Meniu tipărit pentru masa festivă",
    "createdAt": "2026-06-26T10:01:00.000Z"
  }
}
```

**Error `400`**: `name` missing or empty.

---

## New Endpoints: `/api/catalog/[id]`

### `PATCH /api/catalog/[id]`

Update an existing template's `name` and/or `description`.

**Request body** (all fields optional; at least one must be present):
```json
{
  "name": "Meniu de nuntă elegantă",
  "description": "Varianta actualizată"
}
```

**Response `200`**:
```json
{
  "template": {
    "id": "uuid",
    "name": "Meniu de nuntă elegantă",
    "description": "Varianta actualizată",
    "createdAt": "2026-06-26T10:01:00.000Z"
  }
}
```

**Error `400`**: Empty body or empty `name` string.
**Error `404`**: Template not found.

---

### `DELETE /api/catalog/[id]`

Delete a template. Existing `products` rows that referenced it have `template_id` set to `NULL` automatically (DB-level `ON DELETE SET NULL`).

**Response `204`**: No body.

**Error `404`**: Template not found.

---

## Modified Endpoint: `POST /api/orders`

Existing endpoint extended to accept optional `templateIds` array.

**Request body** (updated):
```json
{
  "name": "Nuntă Popescu 14 iulie",
  "templateIds": ["uuid-1", "uuid-2", "uuid-1"]
}
```
`name` — required (unchanged). `templateIds` — optional array of `product_templates.id` values. Duplicates allowed. Unknown IDs are silently skipped.

**Behaviour**: Creates the order and all products from the template list in a single SQLite transaction. Each product's `name` is copied from the template at creation time; `template_id` FK is set. Products start with `status = 'de_facut'`.

**Response `201`** (updated — adds `products` array):
```json
{
  "order": {
    "id": "uuid",
    "name": "Nuntă Popescu 14 iulie",
    "status": "in_progres",
    "productCount": 2,
    "doneCount": 0,
    "createdAt": "2026-06-26T10:05:00.000Z"
  },
  "products": [
    { "id": "uuid-p1", "orderId": "uuid", "name": "Invitație clasică", "status": "de_facut", "templateId": "uuid-1", "createdAt": "..." },
    { "id": "uuid-p2", "orderId": "uuid", "name": "Meniu nuntă", "status": "de_facut", "templateId": "uuid-2", "createdAt": "..." }
  ]
}
```

**Error `400`**: `name` missing or empty (unchanged).

---

## Unchanged Endpoints

All other existing endpoints (`GET /api/orders`, `DELETE /api/orders/[id]`, `GET /api/products`, `POST /api/products`, `PATCH /api/products/[id]`, `DELETE /api/products/[id]`) retain their existing contracts without modification.
