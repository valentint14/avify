# Implementation Plan: Mod producție (Production Mode)

**Branch**: `013-production-mode` | **Date**: 2026-07-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/013-production-mode/spec.md`

## Summary

Add a "Mod producție" page that aggregates all `products` with `status = 'de_realizat'` across every order, groups them by product template name (or product name for ad-hoc items), sums their quantities, and presents an expandable list sorted by total quantity descending. A new `GET /api/mod-productie` route backed by a `getProductionQueue()` lib function drives both the server-side initial load and client-side manual refresh. No new DB tables or columns are required.

> **Clarification note**: Orders do not have a persisted status column. The spec's phrase "comenzi aflate în starea 'De realizat'" maps to individual `products.status = 'de_realizat'` — the product-level Kanban column that means "not yet started". See `research.md` for the full decision log.

## Technical Context

**Language/Version**: JavaScript (ES2022) / Node.js 26 / Next.js 14 (App Router)

**Primary Dependencies**: React 18, Tailwind CSS v4, shadcn/ui (Collapsible from @radix-ui/react-collapsible already available), Lucide React (`RefreshCw`, `ChevronDown` icons already available), `node:sqlite` DatabaseSync

**Storage**: SQLite via `node:sqlite` DatabaseSync — `getDb()` singleton; read-only aggregation query across `products`, `orders`, and `product_templates`; no schema changes needed

**Testing**: Jest (`next/jest`) for integration tests of `getProductionQueue()`; Playwright (`@playwright/test`, `workers: 1`, shared SQLite DB) for E2E tests

**Target Platform**: Web (Next.js local dev server), Windows desktop

**Project Type**: Next.js 14 App Router web application (local desktop deployment)

**Performance Goals**:
- Initial page load with production data: < 2 s (SC-001)
- Manual refresh response: < 2 s (SC-004)
- Single aggregation SQL query — no N+1 patterns; `json_group_array` used for contributing orders

**Constraints**:
- `staleTimes: { dynamic: 0 }` in `next.config.js` MUST NOT change — `export const dynamic = 'force-dynamic'` required on the page
- `node:sqlite` DatabaseSync is synchronous — MUST NOT change to async
- `getDb()` singleton must be used for all DB access
- No new npm packages — shadcn Collapsible and Lucide icons already available

**Scale/Scope**: Up to 500 active orders (SC-001); aggregation via a single SQL `GROUP BY` query

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| Code Quality | PASS | Single-purpose `getProductionQueue()` lib function; route handler thin; page follows existing patterns |
| Testing Standards | PASS | Jest integration covers aggregation SQL logic; Playwright E2E covers US1–US3 acceptance scenarios |
| UX Consistency | PASS | Uses shadcn Collapsible (already installed), Lucide icons, Tailwind tokens only — no custom one-off components |
| Performance | PASS | Single aggregation query with `json_group_array`; SQLite local disk — well under 2 s threshold |
| Accessibility | PASS | Collapsible groups carry `aria-expanded`; empty/error states are readable text; refresh button has `aria-label` |
| No Placeholders | PASS | All tasks reference exact file paths and function signatures |

## Project Structure

### Documentation (this feature)

```text
specs/013-production-mode/
├── plan.md              ← this file
├── research.md          ← Phase 0: status scope, grouping key, refresh mechanism
├── data-model.md        ← ProductionGroup aggregate + SQL query
├── quickstart.md        ← validation scenarios
├── contracts/
│   └── api-contracts.md ← GET /api/mod-productie response shape
└── tasks.md             ← /speckit-tasks output (not yet created)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── mod-productie/
│   │   └── page.js                        ← NEW: Server page (Suspense + async data)
│   └── api/
│       └── mod-productie/
│           └── route.js                   ← NEW: GET /api/mod-productie handler
├── components/
│   ├── ProductionQueue.js                 ← NEW: Client component (groups, drill-down, refresh)
│   └── skeletons/
│       └── ProductionQueueSkeleton.js     ← NEW: Loading skeleton
└── lib/
    ├── navigation.js                      ← EXTEND: add "Mod producție" nav link
    └── productionQueue.js                 ← NEW: getProductionQueue() aggregation function

tests/
├── integration/
│   └── mod-productie/
│       └── productionQueue.test.js        ← NEW: Jest integration tests
└── e2e/
    └── mod-productie.spec.js              ← NEW: Playwright E2E for US1–US3
```

**Structure Decision**: Next.js App Router, single project. New page follows the `stoc-materiale` / `dashboard` pattern: async Server Component → `force-dynamic` → Suspense → skeleton fallback → `<AsyncData>` inner function calls lib directly → passes `initialData` to client component. API route in `src/app/api/mod-productie/route.js` mirrors `/api/orders/`, `/api/materials/` naming. Lib function in `src/lib/productionQueue.js` keeps aggregation logic isolated and testable.

## Implementation Notes

### `getProductionQueue()` (`src/lib/productionQueue.js`)

```js
'use strict';
const { getDb } = require('./db.js');

const PRODUCTION_QUEUE_SQL = `
  SELECT
    COALESCE(pt.id, 'ad_hoc_' || p.name)   AS group_key,
    COALESCE(pt.name, p.name)               AS group_label,
    pt.id                                   AS template_id,
    SUM(p.quantity)                         AS total_quantity,
    json_group_array(
      json_object(
        'orderId',   o.id,
        'orderName', o.name,
        'client',    o.client,
        'quantity',  p.quantity
      )
    )                                       AS contributing_orders_json
  FROM products p
  LEFT JOIN product_templates pt ON p.template_id = pt.id
  JOIN       orders o            ON p.order_id   = o.id
  WHERE p.status = 'de_realizat'
  GROUP BY COALESCE(pt.id, p.name)
  ORDER BY SUM(p.quantity) DESC
`;

function getProductionQueue() {
  const rows = getDb().prepare(PRODUCTION_QUEUE_SQL).all();
  return rows.map((row) => ({
    key:           row.group_key,
    label:         row.group_label,
    templateId:    row.template_id ?? null,
    totalQuantity: Number(row.total_quantity),
    orders:        JSON.parse(row.contributing_orders_json),
  }));
}

module.exports = { getProductionQueue };
```

### `GET /api/mod-productie` (`src/app/api/mod-productie/route.js`)

```js
import { getProductionQueue } from '../../../lib/productionQueue.js';

export async function GET() {
  try {
    return Response.json({
      groups:    getProductionQueue(),
      fetchedAt: new Date().toISOString(),
    });
  } catch {
    return Response.json({ error: 'Eroare internă de server.' }, { status: 500 });
  }
}
```

### `src/app/mod-productie/page.js` (Server page)

```js
import { Suspense } from 'react';
import { getProductionQueue } from '../../lib/productionQueue.js';
import ProductionQueue from '../../components/ProductionQueue.js';
import ProductionQueueSkeleton from '@/components/skeletons/ProductionQueueSkeleton';

export const metadata = { title: 'Mod producție — Avify' };
export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <Suspense fallback={<ProductionQueueSkeleton />}>
      <ProductionQueueData />
    </Suspense>
  );
}

async function ProductionQueueData() {
  await new Promise((resolve) => setImmediate(resolve));
  const groups = getProductionQueue();
  const fetchedAt = new Date().toISOString();
  return <ProductionQueue initialGroups={groups} initialFetchedAt={fetchedAt} />;
}
```

### `ProductionQueue.js` client component key behaviours

- `useState({ groups, fetchedAt, error, loading })` initialised from server props
- `handleRefresh`: `fetch('/api/mod-productie')` → updates state; shows loading indicator on refresh button
- Per-group expand/collapse: `useState<Set<string>>` of expanded `group.key` values, toggled on click
- Empty state: rendered when `groups.length === 0` — "Nicio comandă nu are produse de realizat."
- Error state: destructive alert text + "Reîncearcă" button that calls `handleRefresh`
- Number formatting: `totalQuantity.toLocaleString('ro-RO')` for large quantities
- "Last updated" timestamp: formatted with `new Date(fetchedAt).toLocaleTimeString('ro-RO')`

### Navigation extension (`src/lib/navigation.js`)

```js
export const NAV_LINKS = [
  { label: 'Comenzi',         href: '/' },
  { label: 'Catalog produse', href: '/catalog' },
  { label: 'Stoc materiale',  href: '/stoc-materiale' },
  { label: 'Calendar',        href: '/calendar' },
  { label: 'Mod producție',   href: '/mod-productie' },  // ← NEW
  { label: 'Statistici',      href: '/dashboard' },
];
```

### `ProductionQueueSkeleton.js`

Renders 4 `animate-pulse` rows. Each row: full-width grey bar (group header height) + two narrower bars (simulating order sub-rows). Mirrors `DashboardSkeleton` structure and Tailwind tokens.
