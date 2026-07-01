# Implementation Plan: Harta Vânzărilor

**Branch**: `016-harta-vanzarilor` | **Date**: 2026-07-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/016-harta-vanzarilor/spec.md`

## Summary

Add a "Harta vânzărilor" section to the existing `/dashboard` (Statistici) page displaying an interactive SVG choropleth map of Romania's 42 counties/regions. County fill colour intensity is proportional to either the number of delivered orders or total profit from that county — user-switchable via a toggle. Data is read from the existing `orders` table (no schema changes) via a new `getSalesMapData()` analytics function, passed as props from the existing `DashboardData` RSC to a new `'use client'` `RomaniaSalesMap` component. Radix UI Tooltip (from the existing `radix-ui` package) provides hover pop-ups. County SVG path data is stored as a JS constants file — no SVGR, no new npm packages.

## Technical Context

**Language/Version**: JavaScript (ES2022) / Node.js 26 / Next.js 15 (App Router)

**Primary Dependencies**: React 18, Tailwind CSS v4, `radix-ui` v1.6.0 (Tooltip primitive — already installed), Lucide React (icons — already installed)

**Storage**: SQLite via `node:sqlite` DatabaseSync — `getDb()` singleton; existing `orders` table; no schema changes

**Testing**: Jest (`next/jest`) for integration tests of `getSalesMapData()`; Playwright (`@playwright/test`, `workers: 1`, shared SQLite DB) for E2E tests of map rendering and tooltip interaction

**Target Platform**: Web (Next.js local dev server), Windows desktop

**Project Type**: Next.js 15 App Router web application (local desktop deployment)

**Performance Goals**:
- Map section rendered including DB query: < 2 s from page load (SC-001)
- Tooltip appears on hover: < 200 ms (SC-003) — achieved via `delayDuration={0}` on TooltipProvider
- Metric toggle updates colours: instantaneous client-side state change, no network request (SC-006)
- `getSalesMapData()` SQL: < 50 ms for up to 10 000 orders (SC-007)

**Constraints**:
- `node:sqlite` DatabaseSync is synchronous — MUST NOT change to async
- `getDb()` singleton MUST be used for all DB access
- NO new npm packages — `radix-ui` Tooltip primitive is already available
- County SVG path data stored as static JS constants (no SVGR, no fetch of external SVG asset)
- `export const dynamic = 'force-dynamic'` already set on `src/app/dashboard/page.js`
- SVG county `name` values MUST match `orders.county` values exactly for colour mapping

**Scale/Scope**: 42 SVG paths; typical DB: < 1 000 orders; GROUP BY aggregate query is O(n) on orders table

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| Code Quality | PASS | `getSalesMapData()` is single-purpose; `RomaniaSalesMap` handles only interactive map state; `tooltip.jsx` is a thin shadcn wrapper; `page.js` stays as a thin RSC coordinator |
| Testing Standards | PASS | Jest integration covers `getSalesMapData()` (empty DB, county aggregates, NULL filtering, ordering); Playwright E2E covers US1 (colour coding), US2 (tooltip content), US3 (metric toggle), and the empty-state edge case |
| UX Consistency | PASS | Tooltip uses shadcn wrapper over Radix primitive matching `dialog.jsx`/`select.jsx` style; metric toggle uses existing Tailwind tokens; neutral gray (`hsl(215,15%,88%)`) is consistent with `muted` theme |
| Performance | PASS | Single GROUP BY SQL (no N+1); SVG paths are static JS constants (no network fetch at render); metric toggle is pure client state (no RSC re-render, no API call) |
| Accessibility | PASS | SVG element has `role="img"` + `aria-label`; each county path has `aria-label={name}`; tooltip bound via Radix `aria-describedby`; metric buttons have visible focus rings; section has `aria-label="Harta vânzărilor"` |
| No Placeholders | PASS | All tasks below reference exact file paths, function signatures, SQL, and component prop shapes |

## Project Structure

### Documentation (this feature)

```text
specs/016-harta-vanzarilor/
├── plan.md              ← this file
├── research.md          ← Phase 0: SVG strategy, tooltip, color, metric toggle
├── data-model.md        ← getSalesMapData() signature + CountyDataPoint shape
├── quickstart.md        ← validation scenarios
├── contracts/
│   └── analytics-api.md ← getSalesMapData + component prop contracts
└── tasks.md             ← Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── lib/
│   └── analytics.js                          ← update: add getSalesMapData()
├── components/
│   ├── ui/
│   │   └── tooltip.jsx                       ← new: shadcn Tooltip (Radix wrapper)
│   └── dashboard/
│       ├── romania-counties-paths.js          ← new: 42 county SVG path constants
│       ├── RomaniaSalesMap.jsx                ← new: 'use client' interactive map
│       ├── MonthlyProfitChart.jsx             ← unchanged
│       ├── TopProductsChart.jsx               ← unchanged
│       └── KpiCard.jsx                        ← unchanged
└── app/
    └── dashboard/
        └── page.js                            ← update: add Harta section + getSalesMapData()

tests/
├── integration/
│   └── analytics.test.js                     ← update: add getSalesMapData() tests
└── e2e/
    └── harta-vanzarilor.spec.js              ← new: Playwright E2E
```

**Structure Decision**: Next.js App Router single-project layout. All data-access logic lives in `src/lib/`; all UI components in `src/components/`; page coordination in `src/app/`. Follows existing feature patterns exactly.

## Implementation Phases

### Phase A — Analytics Layer

**File**: `src/lib/analytics.js`

Append after `getDashboardKPIs`:

```js
function getSalesMapData() {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT county,
              COUNT(*)                 AS deliveredCount,
              COALESCE(SUM(profit), 0) AS totalProfit
         FROM orders
        WHERE delivered = 1
          AND county IS NOT NULL
          AND county != ''
        GROUP BY county
        ORDER BY county ASC`
    )
    .all();
  return rows.map((r) => ({
    county: r.county,
    deliveredCount: Number(r.deliveredCount),
    totalProfit: Number(r.totalProfit),
  }));
}
```

Add `getSalesMapData` to `module.exports`.

---

### Phase B — Tooltip shadcn Component

**File**: `src/components/ui/tooltip.jsx` (new)

Pattern identical to `dialog.jsx` — import `{ Tooltip as TooltipPrimitive } from "radix-ui"`. Export:

- `TooltipProvider` — wraps `TooltipPrimitive.Provider` with `delayDuration={0}` default
- `Tooltip` — wraps `TooltipPrimitive.Root`
- `TooltipTrigger` — wraps `TooltipPrimitive.Trigger`
- `TooltipContent` — wraps `TooltipPrimitive.Content` with shadcn styling (card background, border, shadow, slide animations matching other shadcn content components)

---

### Phase C — County SVG Path Constants

**File**: `src/components/dashboard/romania-counties-paths.js` (new)

```js
export const ROMANIA_COUNTIES = [
  { id: 'AB', name: 'Alba',              d: '...' },
  { id: 'AR', name: 'Arad',              d: '...' },
  { id: 'AG', name: 'Argeș',             d: '...' },
  { id: 'BC', name: 'Bacău',             d: '...' },
  { id: 'BH', name: 'Bihor',             d: '...' },
  { id: 'BN', name: 'Bistrița-Năsăud',   d: '...' },
  { id: 'BT', name: 'Botoșani',          d: '...' },
  { id: 'BV', name: 'Brașov',            d: '...' },
  { id: 'BR', name: 'Brăila',            d: '...' },
  { id: 'B',  name: 'București',         d: '...' },
  { id: 'BZ', name: 'Buzău',             d: '...' },
  { id: 'CS', name: 'Caraș-Severin',     d: '...' },
  { id: 'CL', name: 'Călărași',          d: '...' },
  { id: 'CJ', name: 'Cluj',              d: '...' },
  { id: 'CT', name: 'Constanța',         d: '...' },
  { id: 'CV', name: 'Covasna',           d: '...' },
  { id: 'DB', name: 'Dâmbovița',         d: '...' },
  { id: 'DJ', name: 'Dolj',              d: '...' },
  { id: 'GL', name: 'Galați',            d: '...' },
  { id: 'GR', name: 'Giurgiu',           d: '...' },
  { id: 'GJ', name: 'Gorj',              d: '...' },
  { id: 'HR', name: 'Harghita',          d: '...' },
  { id: 'HD', name: 'Hunedoara',         d: '...' },
  { id: 'IL', name: 'Ialomița',          d: '...' },
  { id: 'IS', name: 'Iași',              d: '...' },
  { id: 'IF', name: 'Ilfov',             d: '...' },
  { id: 'MM', name: 'Maramureș',         d: '...' },
  { id: 'MH', name: 'Mehedinți',         d: '...' },
  { id: 'MS', name: 'Mureș',             d: '...' },
  { id: 'NT', name: 'Neamț',             d: '...' },
  { id: 'OT', name: 'Olt',              d: '...' },
  { id: 'PH', name: 'Prahova',           d: '...' },
  { id: 'SM', name: 'Satu Mare',         d: '...' },
  { id: 'SJ', name: 'Sălaj',            d: '...' },
  { id: 'SB', name: 'Sibiu',             d: '...' },
  { id: 'SV', name: 'Suceava',           d: '...' },
  { id: 'TR', name: 'Teleorman',         d: '...' },
  { id: 'TM', name: 'Timiș',            d: '...' },
  { id: 'TL', name: 'Tulcea',            d: '...' },
  { id: 'VS', name: 'Vaslui',            d: '...' },
  { id: 'VL', name: 'Vâlcea',           d: '...' },
  { id: 'VN', name: 'Vrancea',           d: '...' },
];
```

SVG path `d` attribute values sourced from the public-domain Romania county map (Wikipedia Commons / Wikimedia, CC-BY-SA). ViewBox: `0 0 800 700`. Each path is a closed polygon matching NUTS-3 county boundaries.

---

### Phase D — RomaniaSalesMap Client Component

**File**: `src/components/dashboard/RomaniaSalesMap.jsx` (new)

```jsx
'use client';

import { useState, useMemo } from 'react';
import { ROMANIA_COUNTIES } from './romania-counties-paths.js';
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

function countyFill(value, maxValue) {
  if (!value || !maxValue) return 'hsl(215, 15%, 88%)';
  const lightness = Math.round(70 - (value / maxValue) * 32);
  return `hsl(220, 85%, ${lightness}%)`;
}

export default function RomaniaSalesMap({ countyData }) {
  const [metric, setMetric] = useState('orders');

  const dataMap = useMemo(
    () => new Map(countyData.map((d) => [d.county, d])),
    [countyData]
  );

  const maxValue = useMemo(() => {
    if (!countyData.length) return 0;
    return Math.max(
      ...countyData.map((d) =>
        metric === 'orders' ? d.deliveredCount : d.totalProfit
      )
    );
  }, [countyData, metric]);

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {[
          { key: 'orders', label: 'Comenzi' },
          { key: 'profit', label: 'Profit' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setMetric(key)}
            className={
              metric === key
                ? 'rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground'
                : 'rounded-md border border-input px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent'
            }
          >
            {label}
          </button>
        ))}
      </div>

      <TooltipProvider delayDuration={0}>
        <svg
          viewBox="0 0 800 700"
          width="100%"
          preserveAspectRatio="xMidYMid meet"
          aria-label="Harta vânzărilor pe județe"
          role="img"
        >
          {ROMANIA_COUNTIES.map(({ id, name, d }) => {
            const entry = dataMap.get(name);
            const value = entry
              ? metric === 'orders'
                ? entry.deliveredCount
                : entry.totalProfit
              : 0;
            return (
              <Tooltip key={id}>
                <TooltipTrigger asChild>
                  <path
                    d={d}
                    fill={countyFill(value, maxValue)}
                    stroke="hsl(215, 15%, 70%)"
                    strokeWidth={0.5}
                    data-county={name}
                    aria-label={name}
                    className="cursor-pointer transition-opacity hover:opacity-80"
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-semibold">{name}</p>
                  <p>{entry ? entry.deliveredCount : 0} comenzi livrate</p>
                  <p>{(entry ? entry.totalProfit : 0).toFixed(2)} RON</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </svg>
      </TooltipProvider>
    </div>
  );
}
```

---

### Phase E — Dashboard Page Update

**File**: `src/app/dashboard/page.js`

1. Add `getSalesMapData` to the import from `@/lib/analytics`.
2. Add `import RomaniaSalesMap from '@/components/dashboard/RomaniaSalesMap'`.
3. In `DashboardData`, add: `const salesMap = getSalesMapData();`
4. Add section after the "Top produse" section:

```jsx
<section aria-label="Harta vânzărilor">
  <h2 className="mb-4 text-lg font-semibold">Harta vânzărilor</h2>
  <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
    <RomaniaSalesMap countyData={salesMap} />
  </div>
</section>
```

---

### Phase F — Tests

**Integration** — append to `tests/integration/analytics.test.js`:

```js
describe('getSalesMapData', () => {
  test('returns [] when no delivered orders exist');
  test('returns correct deliveredCount per county');
  test('returns correct totalProfit per county (COALESCE NULL → 0)');
  test('excludes orders with county = NULL');
  test('excludes orders with county = empty string');
  test('excludes orders with delivered = 0');
  test('results are ordered alphabetically by county');
});
```

**E2E** — new file `tests/e2e/harta-vanzarilor.spec.js`:

```js
test('harta section heading is visible on dashboard');
test('county with delivered orders has non-gray fill colour');
test('county with no delivered orders has neutral gray fill');
test('tooltip shows county name, count, and profit on hover');
test('tooltip disappears on mouse-out');
test('metric toggle switches between Comenzi and Profit');
test('all counties gray when no delivered orders in DB');
```

## Complexity Tracking

> No constitution violations. No new packages, no new DB tables, no new API routes.
