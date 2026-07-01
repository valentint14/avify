# API Contracts: Product File Attachments (Feature 012)

Base path: `/api/products/{id}/attachment`

---

## GET `/api/products/{id}/attachment`

Serve the attached file content so the browser can render a thumbnail.

### Request

No body. No query parameters.

### Success Response — `200 OK`

Headers:
```
Content-Type: image/png  (or image/jpeg, image/webp, application/pdf)
Content-Length: {bytes}
Cache-Control: no-store
```

Body: Raw file bytes.

### Error Responses

| Status | Body                                                                         | Condition                              |
|--------|------------------------------------------------------------------------------|----------------------------------------|
| 404    | `{ "error": "Produsul nu a fost găsit." }`                                   | Product ID not found in DB             |
| 404    | `{ "error": "Niciun fișier atașat." }`                                       | `graphic_file_path` is null            |
| 404    | `{ "error": "Fișierul nu a fost găsit pe disc." }`                           | File missing from `data/attachments/`  |
| 500    | `{ "error": "Eroare internă de server." }`                                   | Unexpected server error                |

---

## POST `/api/products/{id}/attachment`

Upload a new file attachment, replacing any existing one.

### Request

Content-Type: `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | The graphic file to attach. Must be PDF, PNG, JPG, JPEG, or WEBP. Max size: 20 MB. |

### Success Response — `200 OK`

```json
{
  "product": {
    "id": "abc-123",
    "graphicFilePath": "attachments/abc-123/banner.pdf",
    "..."
  }
}
```

Returns the full updated product object (same shape as `PATCH /api/products/{id}`).

### Error Responses

| Status | Body                                                                              | Condition                             |
|--------|-----------------------------------------------------------------------------------|---------------------------------------|
| 400    | `{ "error": "Niciun fișier furnizat." }`                                          | No file in form data                  |
| 400    | `{ "error": "Tip de fișier neacceptat. Tipuri acceptate: PDF, PNG, JPG, JPEG, WEBP." }` | Extension not in allowed list    |
| 404    | `{ "error": "Produsul nu a fost găsit." }`                                        | Product ID not found in DB            |
| 413    | `{ "error": "Fișierul depășește limita de 20 MB." }`                              | File too large                        |
| 500    | `{ "error": "Eroare internă de server." }`                                        | Unexpected server error               |

---

## DELETE `/api/products/{id}/attachment`

Remove the file attachment from the product and delete the file from disk.

### Request

No body.

### Success Response — `200 OK`

```json
{
  "product": {
    "id": "abc-123",
    "graphicFilePath": null,
    "..."
  }
}
```

Returns the updated product object with `graphicFilePath: null`.

### Error Responses

| Status | Body                                                 | Condition                   |
|--------|------------------------------------------------------|-----------------------------|
| 404    | `{ "error": "Produsul nu a fost găsit." }`           | Product ID not found in DB  |
| 404    | `{ "error": "Niciun fișier atașat." }`               | `graphic_file_path` is null |
| 500    | `{ "error": "Eroare internă de server." }`           | Unexpected server error     |

---

## POST `/api/products/{id}/attachment/open`

Instruct the server to open the attached file in the OS default application.

### Request

No body.

### Success Response — `200 OK`

```json
{ "opened": true }
```

The OS default application launches asynchronously; the server responds as soon as the process is spawned, not when the application finishes.

### Error Responses

| Status | Body                                                                                                         | Condition                        |
|--------|--------------------------------------------------------------------------------------------------------------|----------------------------------|
| 404    | `{ "error": "Produsul nu a fost găsit." }`                                                                   | Product ID not found in DB       |
| 404    | `{ "error": "Niciun fișier atașat." }`                                                                       | `graphic_file_path` is null      |
| 404    | `{ "error": "Fișierul nu a fost găsit la calea stocată. Re-atașați fișierul." }`                             | File missing from disk at runtime|
| 500    | `{ "error": "Eroare internă de server." }`                                                                   | Unexpected server error          |

---

## Updated Product Object Shape

The `parseRow` function in `src/lib/products.js` maps the new column:

```js
{
  id: string,
  orderId: string,
  name: string,
  status: string,
  templateId: string | null,
  quantity: number,
  additionalInfo: string | null,
  unitPrice: number,
  graphicFilePath: string | null,   // NEW
  createdAt: string
}
```

All existing `GET /api/products?orderId={id}` and `PATCH /api/products/{id}` responses are extended with this field automatically (no breaking change — new optional field added).

---

## UI Contracts

### `ProductCard` props (extended)

`product.graphicFilePath` drives the indicator:

| Value                                   | Rendered element                                                        |
|-----------------------------------------|-------------------------------------------------------------------------|
| `null`                                  | No indicator rendered                                                   |
| `"attachments/{id}/name.pdf"`           | `<button>` with Lucide `FileText` icon (24 px), labeled "Deschide grafică" |
| `"attachments/{id}/name.png"` (or jpg/jpeg/webp) | `<button>` with `<img src="/api/products/{id}/attachment" className="h-8 w-8 rounded object-cover" />` |

Clicking either button:
1. Calls `POST /api/products/{id}/attachment/open`
2. On success: no visible change (file opens in OS)
3. On error 404 (file missing): displays inline error text below the indicator

### `ProductDetailsModal` — attachment section (new)

When `product.graphicFilePath` is non-null:
- Shows filename (basename extracted from `graphicFilePath`)
- Shows "Elimină" (remove) button → calls `DELETE /api/products/{id}/attachment`
- Shows "Înlocuiește" (replace) button → triggers hidden `<input type="file">`

When `product.graphicFilePath` is null:
- Shows "Atașează fișier" button → triggers hidden `<input type="file">`

On file selection:
- Validate extension client-side (show error if unsupported)
- `POST /api/products/{id}/attachment` with `FormData`
- On success: update local product state → card re-renders with new indicator
