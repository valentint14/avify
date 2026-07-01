# API & UI Contracts: Generează Listă Cumpărături

**Feature**: [spec.md](../spec.md) | **Plan**: [plan.md](../plan.md)

---

## API Contract: `GET /api/shopping-list`

### Request

```
GET /api/shopping-list
```

No query parameters. No request body. The 30-day window is computed server-side from the current date.

### Success Response — `200 OK`

```json
{
  "rows": [
    {
      "materialId":    "uuid-string",
      "materialName":  "Satin alb",
      "unit":          "ml",
      "totalRequired": 500,
      "currentStock":  200,
      "toBuy":         300
    },
    {
      "materialId":    "uuid-string",
      "materialName":  "Sârmă aurie",
      "unit":          null,
      "currentStock":  150,
      "totalRequired": 100,
      "toBuy":         0
    }
  ],
  "excludedCount": 2,
  "generatedAt":   "2026-07-01T14:30:00.000Z"
}
```

**Field semantics**:

| Field | Type | Notes |
|-------|------|-------|
| `rows` | `ShoppingListRow[]` | Sorted by `materialName` ASC. May be `[]`. |
| `rows[].materialId` | string | Material UUID |
| `rows[].materialName` | string | Display name |
| `rows[].unit` | string \| null | Unit of measure; null if not set |
| `rows[].totalRequired` | number | `SUM(qty_per_piece × quantity)` across all in-scope products |
| `rows[].currentStock` | number | Current stock at query time |
| `rows[].toBuy` | number | `MAX(0, totalRequired − currentStock)` |
| `excludedCount` | number | Count of in-scope products excluded (no template or no recipe) |
| `generatedAt` | string | ISO-8601 UTC timestamp of the calculation |

**Possible `rows` states**:
- `rows = []` and `excludedCount = 0` → no qualifying orders in the 30-day window
- `rows = []` and `excludedCount > 0` → only ad-hoc/no-recipe products (unlikely but valid)
- `rows` non-empty, all `toBuy = 0` → all materials sufficiently stocked
- `rows` non-empty, some `toBuy > 0` → normal case with items to purchase

### Error Response — `500 Internal Server Error`

```json
{
  "error": "Eroare internă de server."
}
```

### Route metadata

```js
export const dynamic = 'force-dynamic';  // no static pre-rendering
```

---

## UI Contract: `ShoppingListModal.js`

### Props

| Prop | Type | Description |
|------|------|-------------|
| `open` | boolean | Controls dialog visibility |
| `onClose` | () => void | Called when user dismisses the dialog |

### State machine

```
CLOSED → [button click] → OPEN + LOADING
LOADING → [fetch success] → OPEN + RESULT
LOADING → [fetch error]   → OPEN + ERROR
RESULT  → [user closes]   → CLOSED
ERROR   → [user closes]   → CLOSED
```

### Data-testid attributes (required for E2E tests)

| Attribute | Element | When visible |
|-----------|---------|--------------|
| `data-testid="shopping-list-modal"` | `DialogContent` root | When dialog is open |
| `data-testid="shopping-list-loading"` | Loading indicator | While fetching |
| `data-testid="shopping-list-row"` | Each `to-buy` material row | When result has toBuy > 0 rows |
| `data-testid="no-orders-message"` | Empty state paragraph | When rows=[] AND excludedCount=0 |
| `data-testid="all-covered-message"` | Covered state paragraph | When rows non-empty AND all toBuy=0 |
| `data-testid="excluded-warning"` | Warning text | When excludedCount > 0 |
| `data-testid="print-button"` | Print button | When result is loaded (not loading/error) |

### Content structure (result state)

```
DialogContent[data-testid="shopping-list-modal"]
├── DialogHeader
│   ├── DialogTitle: "Listă cumpărături"
│   └── Subtitle: "Comenzi în următoarele 30 de zile · Generat la HH:MM:SS"
│
├── [if excludedCount > 0]
│   └── Warning: "X produs(e) fără rețetă nu au putut fi calculate."
│
├── [if rows.length === 0]
│   └── "Nu există comenzi cu termen în următoarele 30 de zile." [data-testid="no-orders-message"]
│
├── [if rows.length > 0 AND all toBuy === 0]
│   └── "Stocul existent acoperă toată producția planificată." [data-testid="all-covered-message"]
│
├── [if toBuyRows.length > 0] — PRIMARY SECTION
│   └── Table/list of materials to buy
│       └── For each row[data-testid="shopping-list-row"]:
│           Material name | Total required (+ unit) | In stock | To buy (highlighted)
│
├── [if coveredRows.length > 0] — SECONDARY SECTION (visually de-emphasised)
│   └── Collapsed or secondary list of fully-covered materials
│
└── DialogFooter[print:hidden]
    ├── Button "Printează lista" [data-testid="print-button"] — calls window.print()
    └── Button "Închide" — calls onClose
```

### Print behaviour

- `DialogFooter` and close button have `className="print:hidden"` — hidden when printing
- `DialogOverlay` (dark backdrop) should not print — apply `print:hidden` via `className` prop
- List content, header, and generation timestamp print without modification
- No page-break considerations required for v1 (list is expected to be short)

### Error state content

```
DialogContent
└── "Eroare la generarea listei. Încearcă din nou."
    + Button "Reîncearcă" → triggers re-fetch
```

### Loading state content

```
DialogContent[data-testid="shopping-list-modal"]
└── Spinner or animated skeleton [data-testid="shopping-list-loading"]
    └── "Se calculează lista..."
```

---

## Button: "Generează listă cumpărături" in `MaterialsPage.js`

| Attribute | Value |
|-----------|-------|
| Element | `<Button>` from shadcn/ui |
| Label | "Generează listă cumpărături" |
| `data-testid` | `"generate-shopping-list-btn"` |
| Position | Top-right of page header (flex justify-between layout) |
| Behaviour | Sets `showShoppingList = true`, which passes `open={true}` to `ShoppingListModal` |
