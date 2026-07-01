# Contract: Analytics API — getSalesMapData

**Module**: `src/lib/analytics.js`
**Consumer**: `src/app/dashboard/page.js` (DashboardData RSC)

---

## Function Contract

```js
/**
 * Returns per-county aggregates for delivered orders.
 * Counties with county = NULL or '' are excluded.
 * Returns [] when no delivered orders exist.
 */
function getSalesMapData(): CountyDataPoint[]
```

### `CountyDataPoint`

```js
{
  county:        string,   // exact value from orders.county; non-null, non-empty
  deliveredCount: number,  // integer ≥ 1
  totalProfit:   number,   // float ≥ 0; zero if all profits are NULL
}
```

### Invariants

- Result is sorted ascending by `county`.
- No entry has `deliveredCount = 0` (filtered by `WHERE delivered = 1`).
- No entry has `county` that is `null`, `undefined`, or `''`.
- `totalProfit` is never `NaN` or negative (profits may be 0 but not negative by convention).
- Uses the `getDb()` singleton — never opens its own connection.

---

## Component Contract: RomaniaSalesMap

**File**: `src/components/dashboard/RomaniaSalesMap.jsx`
**Directive**: `'use client'`

### Props

```js
{
  countyData: CountyDataPoint[]   // required; may be empty []
}
```

### Rendered output invariants

- Renders an SVG element containing exactly 42 `<path>` elements (one per county/region).
- Each path has `data-county="<name>"` attribute for testing.
- Paths for counties absent in `countyData` render with neutral fill color.
- Paths for counties present in `countyData` render with blue fill, intensity proportional to selected metric value.
- A metric toggle renders two buttons: "Comenzi" and "Profit"; active state is visually distinguished.
- On hover, a tooltip appears with: county name, `deliveredCount` (or 0), `totalProfit` formatted as `"X.XX RON"` (or 0.00 RON).

---

## Component Contract: Tooltip (shadcn wrapper)

**File**: `src/components/ui/tooltip.jsx`
**Exports**: `TooltipProvider`, `Tooltip`, `TooltipTrigger`, `TooltipContent`

Follows the same shadcn/radix-ui pattern as `dialog.jsx`. No behavioral contract beyond Radix primitives defaults (delayDuration: 0 for map hover responsiveness, skipDelayDuration: 0).
