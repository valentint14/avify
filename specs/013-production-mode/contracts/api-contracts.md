# API Contracts: Mod producție

## `GET /api/mod-productie`

Returns the aggregated production queue: all products with `status = 'de_realizat'`, grouped by product template (or product name for ad-hoc items), sorted by total quantity descending.

### Request

No parameters, no body.

```
GET /api/mod-productie
```

### Response 200 — success

```json
{
  "groups": [
    {
      "key": "3f2a1b4c-...",
      "label": "Banner PVC 120×60",
      "templateId": "3f2a1b4c-...",
      "totalQuantity": 12,
      "orders": [
        {
          "orderId": "a1b2c3d4-...",
          "orderName": "Comanda Maria Ionescu",
          "client": "Maria Ionescu",
          "quantity": 7
        },
        {
          "orderId": "e5f6g7h8-...",
          "orderName": "Comanda #8",
          "client": null,
          "quantity": 5
        }
      ]
    },
    {
      "key": "ad_hoc_Plic personalizat",
      "label": "Plic personalizat",
      "templateId": null,
      "totalQuantity": 4,
      "orders": [
        {
          "orderId": "i9j0k1l2-...",
          "orderName": "Comanda Popescu",
          "client": "Popescu",
          "quantity": 4
        }
      ]
    }
  ],
  "fetchedAt": "2026-07-01T13:30:00.000Z"
}
```

**Field descriptions**:

| Field | Type | Description |
|-------|------|-------------|
| `groups` | array | Production groups, sorted by `totalQuantity` descending |
| `groups[].key` | string | Stable unique key per group (template UUID or `'ad_hoc_' + productName`) |
| `groups[].label` | string | Human-readable group name (template name or product name) |
| `groups[].templateId` | string \| null | Template UUID if group is template-based; null for ad-hoc products |
| `groups[].totalQuantity` | number | Sum of `quantity` across all contributing `'de_realizat'` products |
| `groups[].orders` | array | Per-order breakdown; sum of `quantity` equals `totalQuantity` |
| `groups[].orders[].orderId` | string | UUID of the contributing order |
| `groups[].orders[].orderName` | string | Display name of the order |
| `groups[].orders[].client` | string \| null | Client name, null if not set on the order |
| `groups[].orders[].quantity` | number | This order's contribution to the group total |
| `fetchedAt` | string | ISO 8601 timestamp of when the data was computed |

**Empty queue** (no `'de_realizat'` products exist):

```json
{
  "groups": [],
  "fetchedAt": "2026-07-01T13:30:00.000Z"
}
```

### Response 500 — server error

```json
{
  "error": "Eroare internă de server."
}
```

## UI Contract: `ProductionQueue` component

Props accepted from the server page:

```ts
{
  initialGroups:    ProductionGroup[]   // initial data from server render
  initialFetchedAt: string              // ISO 8601 timestamp from server render
}
```

Client state managed internally:
- `groups` / `fetchedAt` / `error` / `loading` — updated on refresh
- `expandedKeys: Set<string>` — which groups are expanded (drill-down)

Accessible behaviours:
- Each group row is a `<button>` with `aria-expanded={isExpanded}` and `aria-controls={groupKey + '-orders'}`
- The orders sub-list has `id={groupKey + '-orders'}` and `role="list"`
- Refresh button: `aria-label="Reîncarcă coada de producție"`, disabled while loading
- Error state: `role="alert"` on the error container
- Empty state: visible text "Nicio comandă nu are produse de realizat."
