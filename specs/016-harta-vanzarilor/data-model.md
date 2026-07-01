# Data Model: Harta Vânzărilor

**Feature**: 016-harta-vanzarilor | **Phase**: 1

---

## Existing Tables Used (no schema changes)

### `orders` table — relevant columns

| Column      | Type    | Constraint                          | Role in feature                          |
|-------------|---------|-------------------------------------|------------------------------------------|
| `county`    | TEXT    | nullable, no FK                     | Geographic grouping key for the map      |
| `delivered` | INTEGER | NOT NULL DEFAULT 0, values 0 or 1   | Filter: only `delivered = 1` rows count  |
| `profit`    | REAL    | DEFAULT 0                           | Metric: aggregated per county for color  |

**This feature adds no new tables, columns, or indexes.**

---

## New Analytics Function: `getSalesMapData()`

**File**: `src/lib/analytics.js` (appended)

**Signature**:
```js
function getSalesMapData(): CountyDataPoint[]
```

**Return type** (`CountyDataPoint`):
```js
{
  county: string,          // exact value from orders.county column
  deliveredCount: number,  // COUNT(*) of delivered orders in this county
  totalProfit: number,     // SUM(profit) of delivered orders in this county
}
```

**SQL**:
```sql
SELECT county,
       COUNT(*)                 AS deliveredCount,
       COALESCE(SUM(profit), 0) AS totalProfit
FROM orders
WHERE delivered = 1
  AND county IS NOT NULL
  AND county != ''
GROUP BY county
ORDER BY county ASC
```

**Filtering rules**:
- `delivered = 1` — only fully delivered orders
- `county IS NOT NULL AND county != ''` — excludes ungeocoded orders (no error, no warning)
- `COALESCE(SUM(profit), 0)` — treats NULL profit as 0

---

## Static County Data Asset

**File**: `src/components/dashboard/romania-counties-paths.js`

**Exported shape**:
```js
export const ROMANIA_COUNTIES = [
  {
    id: 'AB',        // Standard SIRUTA/ISO abbreviation
    name: 'Alba',    // Display name (must match orders.county values)
    d: '...',        // SVG path data string
  },
  // ... 41 more entries (total: 42 = 41 județe + București)
]
```

**County list** (42 entries, ordered alphabetically by name):
Alba, Arad, Argeș, Bacău, Bihor, Bistrița-Năsăud, Botoșani, Brașov, Brăila, București, Buzău, Caraș-Severin, Călărași, Cluj, Constanța, Covasna, Dâmbovița, Dolj, Galați, Giurgiu, Gorj, Harghita, Hunedoara, Ialomița, Iași, Ilfov, Maramureș, Mehedinți, Mureș, Neamț, Olt, Prahova, Satu Mare, Sălaj, Sibiu, Suceava, Teleorman, Timiș, Tulcea, Vaslui, Vâlcea, Vrancea

---

## Component Data Flow

```
SQLite (orders table)
        │
        ▼ getSalesMapData() — src/lib/analytics.js
CountyDataPoint[]   (server-side, synchronous)
        │
        ▼ passed as prop: countyData={...}
RomaniaSalesMap     — src/components/dashboard/RomaniaSalesMap.jsx
  ('use client')
        │
        ├── useState: metric ('orders' | 'profit')  — controls color intensity
        ├── useState: hoveredCounty (string | null)  — controls tooltip
        │
        ▼ internal lookup: Map<name, CountyDataPoint>
county fill color   — computed per-render, no additional state
```

---

## Component Props Interface

### `RomaniaSalesMap`

```js
RomaniaSalesMap({
  countyData: CountyDataPoint[]   // from getSalesMapData(), may be empty array
})
```

No other props. The component is fully self-contained for the metric toggle.

### `Tooltip` (src/components/ui/tooltip.jsx)

Follows shadcn pattern, wraps Radix primitives:

```js
// Exported components:
TooltipProvider   // Wraps the feature; delayDuration configurable
Tooltip           // Alias for TooltipPrimitive.Root
TooltipTrigger    // Alias for TooltipPrimitive.Trigger
TooltipContent    // Styled wrapper for TooltipPrimitive.Content
```

---

## Color Computation

**Function** (pure, lives inside `RomaniaSalesMap.jsx`):
```js
function countyFill(value, maxValue) {
  if (value === 0 || maxValue === 0) return 'hsl(215, 15%, 88%)';  // neutral gray
  const intensity = value / maxValue;                               // [0, 1]
  const lightness = Math.round(70 - intensity * 32);               // [38, 70]
  return `hsl(220, 85%, ${lightness}%)`;
}
```

| Scenario              | Fill color               |
|-----------------------|--------------------------|
| 0 delivered orders    | `hsl(215, 15%, 88%)`     |
| Lowest active county  | `hsl(220, 85%, 70%)`     |
| Highest active county | `hsl(220, 85%, 38%)`     |

---

## Test Data Requirements

For E2E / integration tests:
- Seed at minimum 3 counties with different `deliveredCount` values (e.g., Cluj: 5, Iași: 2, Timiș: 10)
- Seed 1 county with `delivered = 0` only (e.g., Sibiu) — must render neutral
- Seed 1 order with `county = NULL` — must be excluded from map without error
- Existing seed script (`scripts/seed.js`) should be extended to set `county` and `delivered` fields on seed orders
