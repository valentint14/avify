# API Contracts: Client Design Approval Portal (015)

## Public Endpoints (no authentication required)

---

### `GET /api/aprobare/[uuid]`

Fetches the approval page data for a given token.

**Path parameter**: `uuid` — the approval token UUID

**Success `200 OK`**

```json
{
  "order": {
    "id": "string (UUID)",
    "name": "string",
    "client": "string | null"
  },
  "products": [
    {
      "id": "string (UUID)",
      "name": "string",
      "quantity": 1,
      "hasFile": true,
      "approved": false
    }
  ]
}
```

**Field notes**:
- `hasFile`: `true` if `graphic_file_path` is non-null on the product; drives whether "Aprobă design" is enabled (FR-007).
- `approved`: `true` if a `product_approvals` row exists for `(tokenId, productId)`.
- Products are ordered by `created_at ASC` (insertion order).

**Error `404 Not Found`**

```json
{
  "error": "Acest link de aprobare nu este valid sau a expirat. Contactați studioul pentru un nou link."
}
```

Returned when the UUID does not match any row in `approval_tokens`.

**Error `500 Internal Server Error`**

```json
{
  "error": "Eroare internă de server."
}
```

---

### `POST /api/aprobare/[uuid]/[productId]`

Records the client's approval for a specific product within an approval token session.

**Path parameters**:
- `uuid` — the approval token UUID
- `productId` — the product UUID to approve

**Request body**: none required

**Success `200 OK`**

```json
{
  "approved": true,
  "productId": "string (UUID)"
}
```

The action is idempotent: if the product is already approved for this token, the response is the same `200 OK` (no duplicate record is created — `INSERT OR IGNORE` at the DB level).

**Error `404 Not Found`** — token not found or product not in the order linked to this token

```json
{
  "error": "Link de aprobare sau produs negăsit."
}
```

**Error `400 Bad Request`** — product exists but has no attached file (approval without seeing the design is blocked, per FR-007)

```json
{
  "error": "Produsul nu are un fișier grafic atașat."
}
```

**Error `500 Internal Server Error`**

```json
{
  "error": "Eroare internă de server."
}
```

---

## File Serving (existing endpoint, reused)

### `GET /api/products/[id]/attachment`

Serves the raw graphic file for a product. Already implemented in feature 012. The approval page uses this endpoint directly to render product files.

**Response**: binary file content with `Content-Type` header set to the appropriate MIME type (PDF, PNG, JPEG, WebP).

**Error `404`** if no file is attached or the file is missing on disk.

---

## UI Component Contract: `ApprovalClientView`

Client Component located at `src/components/ApprovalClientView.js`.

**Props**:

| Prop         | Type     | Required | Description                                           |
|--------------|----------|----------|-------------------------------------------------------|
| `order`      | `object` | yes      | `{ id, name, client }` from the GET response          |
| `products`   | `array`  | yes      | Array of product objects from the GET response         |
| `tokenId`    | `string` | yes      | The approval token UUID (for constructing POST URLs)   |

**State managed internally**:
- `approvedIds`: `Set<string>` — initialized from `products.filter(p => p.approved).map(p => p.id)`. Updated optimistically on successful POST.

**Interaction contract**:
1. Renders a card for each product with `data-testid="product-card-{productId}"`.
2. Cards where `approvedIds.has(productId)` are rendered with `data-testid="product-card-approved-{productId}"` and a green background class.
3. The "Aprobă design" button has `data-testid="approve-btn-{productId}"`.
4. Products with `hasFile === false` render the button as disabled with a tooltip: "Niciun fișier atașat".
5. On approval, the button text changes to "Design aprobat ✓" and becomes `disabled`.
6. On POST failure, an inline error message appears: "Eroare la aprobare. Încercați din nou."

**Error page contract** (rendered by `page.js` when token not found):
- `data-testid="approval-not-found"` on the error container.
- Displays: "Acest link de aprobare nu este valid sau a expirat. Contactați studioul pentru un nou link."
