# UI Contracts: Orders Calendar

## CalendarGrid Component

**Purpose**: Client-side monthly calendar displaying order events. Manages month navigation state.

**Props**:
```
orders: Array<Order>   // all orders returned by getAllWithStatus()
```

**State**:
```
{ year: number, month: number }   // 0-indexed month (Jan = 0)
```
Initialised to the current month/year on mount.

**Renders**:
- Heading: displayed month and year (e.g., "Iulie 2026")
- Navigation: "Luna anterioară" button, "Azi" button, "Luna următoare" button
- 7-column grid with Romanian weekday headers (Lun, Mar, Mie, Joi, Vin, Sâm, Dum)
- Day cells: `CalendarDay` objects for the displayed month + padding days from adjacent months
- Event chips inside each day cell (see EventChip below)

**Behaviour**:
- "Luna anterioară" decrements month, wraps December → January / year change
- "Luna următoare" increments month, wraps
- "Azi" resets to current year + month

---

## EventChip

**Purpose**: Inline sub-component inside a day cell. Represents one CalendarEvent.

**Props**:
```
event: CalendarEvent   // { order, date, type }
onClick: (event: CalendarEvent) => void
```

**Renders**:
- Truncated order name (max ~22 chars, ellipsis if longer)
- Visual style: blue chip for `type: "eveniment"`, amber chip for `type: "livrare"`
- Short prefix label: "Ev:" for eveniment, "Liv:" for livrare

**Overflow rule**: Day cells show at most 3 EventChips. If `events.length > 3`, the 4th+ are hidden and a non-interactive "+N alte" label is shown below the third chip. Clicking "+N alte" has no action (informational only in v1).

---

## OrderDetailDialog Component

**Purpose**: Client Component that wraps the existing shadcn `Dialog`. Shows full order details and lazy-loaded products.

**Props**:
```
event:    CalendarEvent | null   // null = dialog closed
onClose:  () => void
```

**Rendered when `event !== null`**:

Dialog header:
- Order name (DialogTitle)
- Event type label: "Eveniment" (blue badge) or "Livrare" (amber badge) — indicates which date triggered the click

Dialog body — Order metadata section:
- Client (if non-null)
- Județ / County (if non-null)
- Platformă contact (if non-null)
- Dată eveniment (if non-null)
- Termen livrare (if non-null)
- Avans: `{advance} RON`
- Profit: `{profit} RON`
- Status colectare: "Da" / "Nu"
- Status livrare: "Da" / "Nu"

Dialog body — Products section:
- Heading "Produse"
- While loading: skeleton rows (3 × h-6 Skeleton)
- When loaded and `products.length > 0`: table/list showing for each product: name, status (Romanian label), quantity, unit price
- When loaded and `products.length === 0`: "Această comandă nu are produse." paragraph

Dialog footer:
- "Închide" button (DialogClose)

**Product fetch**:
- Triggered by `useEffect` when `event` becomes non-null
- Calls `GET /api/products?orderId={event.order.id}`
- Shows skeleton during load; replaces with product list on success

**Close behaviour**:
- Escape key: dialog closes (Radix handles natively)
- Click outside overlay: dialog closes (Radix handles natively)
- "Închide" button: calls `onClose()`

---

## API Contracts (Existing — No Changes)

### GET /api/orders

Returns all orders including calendar-relevant fields.

**Response**:
```json
{
  "orders": [
    {
      "id": "uuid",
      "name": "string",
      "client": "string | null",
      "county": "string | null",
      "contactPlatform": "string | null",
      "eventDate": "YYYY-MM-DD | null",
      "deliveryDate": "YYYY-MM-DD | null",
      "advance": 0,
      "profit": 0,
      "collected": false,
      "delivered": false,
      "productCount": 0,
      "doneCount": 0,
      "total": 0,
      "status": "in_progres | finalizata",
      "createdAt": "ISO-8601"
    }
  ]
}
```

### GET /api/products?orderId={id}

Returns products for a specific order.

**Response**:
```json
{
  "products": [
    {
      "id": "uuid",
      "orderId": "uuid",
      "name": "string",
      "status": "de_facut | in_design | validare_client | printare | asamblare | gata",
      "quantity": 1,
      "unitPrice": 0.0,
      "templateId": "uuid | null",
      "additionalInfo": "string | null",
      "createdAt": "ISO-8601"
    }
  ]
}
```

Both endpoints already exist and return the necessary data. No new API routes are required for this feature.
