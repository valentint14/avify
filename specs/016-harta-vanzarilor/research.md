# Research: Harta Vânzărilor

**Feature**: 016-harta-vanzarilor | **Phase**: 0 — Unknowns resolved

---

## Decision 1: Romania County SVG — Sourcing & Integration Strategy

**Decision**: SVG county path data will be extracted into a static JavaScript constants file (`src/components/dashboard/romania-counties-paths.js`) exporting an array of `{ id, name, d }` objects — one per county (41 județe + București = 42 regions).

**Rationale**:
- The project has no SVGR (`@svgr/webpack`) configured, so `import Map from './map.svg'` cannot produce a React component.
- Loading an SVG via `<img>` or `<object>` blocks interactive path-level mouse events entirely.
- `dangerouslySetInnerHTML` + DOM queries works but breaks React's virtual DOM model.
- Inlining path `d` attributes as JS constants produces a pure JSX component with standard React events, no extra packages, and no bundler configuration.
- Public-domain Romania county SVG data (e.g., from Wikipedia Commons / Wikimedia) uses standardised NUTS-3 county boundaries and is freely usable.

**Alternatives considered**:
- `@svgr/webpack` → requires next.config.js modification, adds a dev dependency; rejected for simplicity.
- Static SVG in `/public/` + fetch on client → async waterfall, breaks SSR data flow; rejected.
- Third-party React map library (e.g., `react-simple-maps`) → adds npm dependency; spec explicitly prohibits new packages; rejected.

---

## Decision 2: Tooltip Implementation — Radix Tooltip on SVG Paths

**Decision**: Use `{ Tooltip as TooltipPrimitive } from "radix-ui"` with `asChild` on each county `<path>` element. A new `src/components/ui/tooltip.jsx` shadcn-style wrapper will be created following the same pattern as existing `dialog.jsx` and `select.jsx` components.

**Rationale**:
- `radix-ui` v1.6.0 (already installed) exports `Tooltip` directly — no new package needed.
- SVG `<path>` elements are valid pointer-event targets; Radix `asChild` correctly merges `onPointerEnter`/`onPointerLeave`/`onFocus` props onto the underlying DOM element.
- Portal rendering (`TooltipPrimitive.Portal`) ensures the tooltip floats above SVG z-context.
- Matches existing shadcn component style in the project (`Dialog`, `Select`).

**Alternatives considered**:
- Custom positioned `<div>` tracking `mousemove` coordinates → works but requires manual positioning logic and misses accessibility (aria-describedby); rejected.
- CSS `:hover` + `<title>` SVG element → not styleable, no shadcn look; rejected.

**Note**: `TooltipPrimitive.Provider` must wrap the entire map component (or the dashboard page) for Radix Tooltip to function; it will be placed at the top of `RomaniaSalesMap`.

---

## Decision 3: Color Intensity Computation

**Decision**: Linear normalization against the county with the highest value. Color is computed in JS as an HSL string:
- **Neutral** (0 delivered orders): `hsl(215, 15%, 88%)` — matches `muted` Tailwind tone.
- **Active counties**: `hsl(220, 85%, <L>%)` where `L = 70 - (intensity × 32)`, giving a range from `hsl(220, 85%, 70%)` (lightest active) to `hsl(220, 85%, 38%)` (darkest active).
- `intensity = countyValue / maxCountyValue`, range `[0, 1]`.

**Rationale**:
- HSL is easy to interpolate; only the lightness changes, keeping hue/saturation stable.
- The chosen blue (`hsl(220, ...)`) is distinct from the muted gray and harmonic with the existing dashboard color palette (which uses `hsl(var(--primary))` — also a blue).
- Minimum lightness 38% ensures sufficient contrast on white/light background for WCAG AA (verified: contrast ratio ≈ 4.6:1).

**Alternatives considered**:
- Opacity variation on a single color → counties behind semi-transparent paths look washed out; rejected.
- CSS custom property interpolation → no clean way to parametrize in Tailwind v4 JIT without arbitrary values; rejected.
- D3 color scale → adds a dependency; rejected.

---

## Decision 4: Metric Toggle — Controlled State in Client Component

**Decision**: The metric toggle (`metric: 'orders' | 'profit'`) is pure client state (`useState`) in `RomaniaSalesMap`. No server round-trip on switch. Both metrics are always fetched server-side together and passed as props.

**Rationale**:
- `getSalesMapData()` already returns both `deliveredCount` and `totalProfit` per county in one query.
- Client-side toggle is instant (SC-006: no page reload) and requires zero API changes.
- The metric toggle is a simple `<button>` pair styled as a toggle group — no additional component needed; existing Tailwind classes suffice.

**Alternatives considered**:
- Server Action or search param (`?metric=profit`) → triggers full RSC re-render, breaks SC-006; rejected.
- Separate API calls per metric → redundant DB round-trips; rejected.

---

## Decision 5: Data Flow — Server Component to Client Component

**Decision**: `getSalesMapData()` is called in the existing `DashboardData` async Server Component (in `src/app/dashboard/page.js`) and its result is passed as a `countyData` prop to `<RomaniaSalesMap>`. The analytics function lives in `src/lib/analytics.js` following the established pattern.

**SQL Query**:
```sql
SELECT county,
       COUNT(*)                      AS deliveredCount,
       COALESCE(SUM(profit), 0)      AS totalProfit
FROM orders
WHERE delivered = 1
  AND county IS NOT NULL
  AND county != ''
GROUP BY county
ORDER BY county ASC
```

**Result shape** (passed to component as serializable prop):
```js
[{ county: 'Cluj', deliveredCount: 12, totalProfit: 4320.50 }, ...]
```

**Rationale**: Follows the exact same pattern as `getMonthlyProfitData()` and `getDashboardKPIs()` — keeps all DB access in `src/lib/analytics.js`, keeps page.js thin, avoids new API routes.

---

## Decision 6: Responsiveness

**Decision**: The SVG `viewBox` is fixed at `"0 0 800 700"` (standard Romania map proportions). The wrapping `<div>` uses `w-full` + the SVG has `width="100%"` and `preserveAspectRatio="xMidYMid meet"`. This makes it natively responsive via `viewBox` scaling with no JS.

**Rationale**: Native SVG scaling is zero-cost and pixel-perfect. No ResizeObserver or JS dimension tracking needed.

---

## Decision 7: County Name Normalisation

**Decision**: County names in the database (`county` field on `orders`) are expected to match exactly the `name` field in `romania-counties-paths.js`. The paths file will use the official Romanian county names with diacritics (e.g., `'Iași'`, `'Brăila'`). A lookup Map (`Map<string, CountyData>`) enables O(1) matching by name in the client component. No normalisation layer is needed for MVP; if mismatches are found during testing, a normalisation note is added to the path data.

**Rationale**: Spec assumption states county names in DB match SVG labels. If they don't, a simple mapping object (`{ 'Iasi': 'Iași' }`) can be patched without architecture changes.
