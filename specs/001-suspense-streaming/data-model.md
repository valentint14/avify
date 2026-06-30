# Data Model: Suspense Streaming & Progressive Loading

**Feature**: 001-suspense-streaming
**Date**: 2026-06-30

---

## Overview

This feature introduces no new data entities and makes no changes to the SQLite schema. All existing entities (orders, products, product_templates, materials, recipe_lines) remain unchanged.

The "data model" for this feature is the **visual skeleton shape** — the structural representation of each page's loading state.

---

## New Source Artifacts

### 1. Skeleton Base Component

**Path**: `src/components/ui/skeleton.jsx`

| Property | Value |
|----------|-------|
| Kind | Shared UI primitive |
| Props | `className` (string, optional), any valid `div` HTML attributes |
| Behaviour | Renders a `<div>` with Tailwind `animate-pulse rounded-md bg-muted`. Composable by stacking and sizing. |

---

### 2. Per-Route Skeleton Components

These are purely presentational components with no props. They represent the visual shape of each page at loading time.

#### `OrdersListSkeleton`

**Path**: `src/components/skeletons/OrdersListSkeleton.jsx`

Structure mirrors `OrderList`:
- One filter-bar skeleton row (same height as `OrderFilters` strip)
- Five order-row skeletons, each containing:
  - A wide name bar (`flex-1`, ~60% width)
  - Two badge-shaped pills (status, collected/delivered indicators)
  - A narrow action area on the right

Container: `mx-auto max-w-6xl p-6 flex flex-col gap-2` (mirrors `OrderList`)

#### `CatalogPageSkeleton`

**Path**: `src/components/skeletons/CatalogPageSkeleton.jsx`

Structure mirrors `CatalogPage`:
- One "add product" form area skeleton (full-width bar with a button placeholder)
- Five catalog-row skeletons, each containing:
  - A name bar (~40% width)
  - A description bar (~70% width, shorter height)
  - Two action button placeholders on the right

#### `MaterialsPageSkeleton`

**Path**: `src/components/skeletons/MaterialsPageSkeleton.jsx`

Structure mirrors `MaterialsPage`:
- One "add material" form skeleton (field row + button)
- Five material-row skeletons, each containing:
  - A name bar (~35% width)
  - Three numeric cell placeholders (stock, min-stock, unit)
  - Two action button placeholders

---

### 3. Async Data Sub-Components

These replace the synchronous data-fetch calls currently inside page functions. They are async Server Components that are invisible to the user — they exist only to create a Suspense boundary.

| Component | Path | Fetches |
|-----------|------|---------|
| `OrdersData` | `src/app/page.js` (local async function) | `getAllWithStatus()` from `src/lib/orders.js` |
| `CatalogData` | `src/app/catalog/page.js` (local async function) | `listAll()` from `src/lib/productTemplates.js` |
| `StocMaterialeData` | `src/app/stoc-materiale/page.js` (local async function) | `listAll()` from `src/lib/materials.js` |

These are defined as local `async function` declarations within the page file (not separate files), since they are tightly coupled to the route.

---

## State Transitions

None. The streaming state (loading → loaded | error) is managed entirely by React Suspense and the Next.js App Router. There is no client state change in this feature.

---

## Invariants Preserved

- `export const dynamic = 'force-dynamic'` on all pages — ensures no stale data is served.
- `staleTimes: { dynamic: 0 }` in `next.config.js` — no router cache for dynamic routes. **Must not be changed.**
- Data freshness contract: all three routes continue to query SQLite on every navigation.
