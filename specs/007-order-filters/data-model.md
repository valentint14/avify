# Data Model: Order Filters

**Feature**: 007-order-filters
**Date**: 2026-06-29

---

## Overview

This feature introduces no new persistent data entities. Filtering is a transient, in-memory operation over the existing `Order` entity. The only new "data" is the ephemeral **Filter State** held in React component state.

---

## Existing Entity: Order (read-only from filter's perspective)

Fields consumed by the filter function:

| Field | Type | Source | Filter dimension |
|---|---|---|---|
| `client` | `string \| null` | `orders.client` (DB column) | Client name text search |
| `county` | `string \| null` | `orders.county` (DB column) | County dropdown |
| `contactPlatform` | `string \| null` | `orders.contact_platform` (DB column) | Platform dropdown |
| `collected` | `boolean` | `orders.collected` (DB column, 0/1 → bool) | Collection status |
| `delivered` | `boolean` | `orders.delivered` (DB column, 0/1 → bool) | Delivery status |

All fields are already returned by `GET /api/orders` and present in `OrderList.js` state.

---

## New Transient Entity: FilterState

**Scope**: React component state only — never persisted, resets on page refresh.

| Field | Type | Default | Meaning |
|---|---|---|---|
| `clientSearch` | `string` | `''` | Partial, case-insensitive match against `order.client`. Empty = no filter. |
| `county` | `string` | `''` | Exact match against `order.county`. Empty string = "Toate" (no filter). |
| `platform` | `string` | `''` | Exact match against `order.contactPlatform`. Empty string = no filter. |
| `collected` | `'' \| 'true' \| 'false'` | `''` | `''` = no filter; `'true'` = collected only; `'false'` = uncollected only. |
| `delivered` | `'' \| 'true' \| 'false'` | `''` | `''` = no filter; `'true'` = delivered only; `'false'` = undelivered only. |

**Validation rules**:
- `clientSearch`: no validation; any string is valid (empty disables the filter)
- `county` / `platform`: must be either `''` or a value that exists in the current option list
- `collected` / `delivered`: constrained to the three enum values above

---

## Derived Values

| Value | Derived from | Description |
|---|---|---|
| `filteredOrders` | `orders` + `filterState` | The subset of orders matching all active filter dimensions simultaneously (AND logic). Computed in `OrderList.js` via `useMemo`. |
| `countyOptions` | `orders` | Distinct non-null, non-empty `county` values from the loaded order list. Computed via `useMemo`. |
| `platformOptions` | `orders` | Distinct non-null, non-empty `contactPlatform` values from the loaded order list. Computed via `useMemo`. |

---

## Filter Logic (pure function contract)

```
filterOrders(orders: Order[], filters: FilterState): Order[]
```

An order passes the filter if and only if ALL of the following are true:

1. `filters.clientSearch === ''` OR (`order.client` is non-null AND `order.client.toLowerCase().includes(filters.clientSearch.toLowerCase())`)
2. `filters.county === ''` OR `order.county === filters.county`
3. `filters.platform === ''` OR `order.contactPlatform === filters.platform`
4. `filters.collected === ''` OR `order.collected === (filters.collected === 'true')`
5. `filters.delivered === ''` OR `order.delivered === (filters.delivered === 'true')`
