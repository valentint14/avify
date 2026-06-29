# UI Component Contracts: Order Filters

**Feature**: 007-order-filters
**Date**: 2026-06-29

---

## Overview

This feature adds one new component (`OrderFilters`) and modifies one existing component (`OrderList`). No new API endpoints are introduced.

---

## New Component: `OrderFilters`

**File**: `src/components/OrderFilters.js`

**Responsibility**: Renders the filter panel (search bar + dropdowns + status selects + reset button). Stateless — all state is owned by the parent.

### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `filters` | `FilterState` | ✅ | Current filter values (see data-model.md) |
| `onChange` | `(key: string, value: string) => void` | ✅ | Called when any single filter dimension changes |
| `onReset` | `() => void` | ✅ | Called when the user clicks "Resetează filtrele" |
| `countyOptions` | `string[]` | ✅ | Distinct county values from current order data |
| `platformOptions` | `string[]` | ✅ | Distinct platform values from current order data |

### Rendered Controls

| Control | HTML element | Label | Behaviour |
|---|---|---|---|
| Client search | `<input type="text">` | "Caută client" | Controlled by `filters.clientSearch`; calls `onChange('clientSearch', value)` on each `change` event (no debounce — component is stateless) |
| County | `<select>` | "Județ" | First option: `<option value="">Toate județele</option>`; remaining options from `countyOptions`; calls `onChange('county', value)` |
| Platform | `<select>` | "Platformă contact" | First option: `<option value="">Toate platformele</option>`; remaining from `platformOptions`; calls `onChange('platform', value)` |
| Collected | `<select>` | "Încasare" | Options: `''` = Toate, `'true'` = Încasată, `'false'` = Neîncasată; calls `onChange('collected', value)` |
| Delivered | `<select>` | "Livrare" | Options: `''` = Toate, `'true'` = Livrată, `'false'` = Nelivrată; calls `onChange('delivered', value)` |
| Reset | `<button>` | "Resetează filtrele" | Calls `onReset()`; visible only when at least one filter dimension is non-default |

### Accessibility Requirements

- Every control MUST have an associated `<label>` (via `htmlFor` / `id` pair or `aria-label`)
- The reset button MUST be keyboard-focusable and actionable via `Enter`/`Space`
- Empty-state message (when `filteredOrders.length === 0`) MUST use `role="status"` or equivalent live region so screen readers announce the change

---

## Modified Component: `OrderList`

**File**: `src/components/OrderList.js`

### New state

```js
const [filterState, setFilterState] = useState(DEFAULT_FILTERS);
```

### New derived values (via `useMemo`)

```js
const countyOptions   = useMemo(() => deriveOptions(orders, 'county'), [orders]);
const platformOptions = useMemo(() => deriveOptions(orders, 'contactPlatform'), [orders]);
const filteredOrders  = useMemo(() => filterOrders(orders, filterState), [orders, filterState]);
```

### New handlers

```js
function handleFilterChange(key, value) {
  setFilterState((prev) => ({ ...prev, [key]: value }));
}
function handleFilterReset() {
  setFilterState(DEFAULT_FILTERS);
}
```

### Render changes

- `<OrderFilters>` rendered immediately below `<AddOrderForm>` and above the order rows
- Replace `orders.map(...)` with `filteredOrders.map(...)`
- Replace the existing empty-state paragraph with a conditional:
  - When `orders.length === 0`: "Nu există comenzi. Adaugă prima comandă."
  - When `filteredOrders.length === 0` but `orders.length > 0`: "Nicio comandă găsită pentru filtrele selectate."

---

## New Pure Function: `filterOrders`

**File**: `src/lib/orderFilters.js`

**Signature**:
```js
/**
 * @param {object[]} orders - Full order list from API
 * @param {object}   filters - FilterState object
 * @returns {object[]} Orders matching all active filters
 */
function filterOrders(orders, filters) { ... }

module.exports = { filterOrders };
```

Full filter logic is specified in [data-model.md](../data-model.md).

---

## New Styles

**File**: `src/styles/order-filters.css`

| Selector | Purpose |
|---|---|
| `.order-filters` | Wrapper — flex row, wraps on mobile, gap between controls |
| `.order-filters__control` | Individual label + input wrapper |
| `.order-filters__label` | Small label above each control |
| `.order-filters__input` | Text search input |
| `.order-filters__select` | Dropdown select |
| `.order-filters__reset` | Reset button — muted style, only visible when filters are active |
| `.order-filters--active` | Modifier on `.order-filters` when any filter is non-default (optional visual indicator) |
