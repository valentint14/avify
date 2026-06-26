# API Contracts: Order Product Details (Quantity & Notes)

All endpoints follow the existing project convention: JSON request/response, no authentication.

---

## Modified: `POST /api/products`

Creates a new product in an order. Now accepts `quantity` and `additionalInfo`.

### Request Body

```json
{
  "orderId": "string (required, UUID)",
  "name": "string (required)",
  "templateId": "string | null (optional)",
  "quantity": "integer ≥ 1 (optional, default 1)",
  "additionalInfo": "string | null (optional)"
}
```

### Responses

**201 Created**
```json
{
  "product": {
    "id": "uuid",
    "orderId": "uuid",
    "name": "Tricou personalizat",
    "status": "de_facut",
    "templateId": "uuid | null",
    "quantity": 3,
    "additionalInfo": "Text client: «La mulți ani!», font Arial, culoare roșu",
    "createdAt": "2026-06-26T10:00:00.000Z"
  }
}
```

**400 Bad Request** — missing/invalid `orderId` or `name`, or `quantity` < 1
```json
{ "error": "Cantitatea trebuie să fie un număr întreg pozitiv." }
```

**409 Conflict** — same template already exists in this order
```json
{ "error": "Produsul există deja în această comandă." }
```

**404 Not Found** — `orderId` not found
```json
{ "error": "Comanda nu a fost găsită." }
```

---

## Modified: `PATCH /api/products/[id]`

Updates a product. Now accepts `quantity` and/or `additionalInfo` in addition to the existing `status`.

### Request Body (all fields optional; send only what changes)

```json
{
  "status": "string (one of 6 valid stage ids) | omit",
  "quantity": "integer ≥ 1 | omit",
  "additionalInfo": "string | null | omit"
}
```

**Rules**:
- At least one field must be present.
- `status` and `quantity`/`additionalInfo` may be combined in one request.
- `additionalInfo: null` clears the field.

### Responses

**200 OK**
```json
{
  "product": {
    "id": "uuid",
    "orderId": "uuid",
    "name": "Tricou personalizat",
    "status": "printare",
    "templateId": "uuid | null",
    "quantity": 5,
    "additionalInfo": null,
    "createdAt": "2026-06-26T10:00:00.000Z"
  }
}
```

**400 Bad Request** — invalid `status`, or `quantity` < 1, or no fields provided
```json
{ "error": "Status invalid." }
```

**404 Not Found**
```json
{ "error": "Produsul nu a fost găsit." }
```

---

## Unchanged: `GET /api/products?orderId={id}`

Returns all products for an order. Response shape is now extended with `quantity` and `additionalInfo`:

```json
{
  "products": [
    {
      "id": "uuid",
      "orderId": "uuid",
      "name": "Tricou personalizat",
      "status": "de_facut",
      "templateId": "uuid",
      "quantity": 3,
      "additionalInfo": "Font Arial, culoare roșu",
      "createdAt": "2026-06-26T10:00:00.000Z"
    }
  ]
}
```

---

## Unchanged endpoints

- `GET /api/orders` — no change
- `POST /api/orders` — no change (products are added separately via AddProductForm)
- `DELETE /api/orders/[id]` — no change
- `DELETE /api/products/[id]` — no change
- `GET /api/catalog`, `POST /api/catalog`, etc. — no change
