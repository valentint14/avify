# Implementation Plan: Orders Calendar

**Branch**: `011-orders-calendar` | **Date**: 2026-06-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/011-orders-calendar/spec.md`

## Summary

Add a `/calendar` page that renders a monthly grid of orders, mapping each order's `event_date` and `delivery_date` fields to chips on the correct day cells. Clicking a chip opens a shadcn Dialog with full order details and lazily-loaded products. Month navigation is handled client-side; order data is fetched server-side on page load via the established RSC + Suspense pattern. No new npm dependencies, no new database tables, no migrations.

## Technical Context

**Language/Version**: JavaScript (ES2022) / Node.js 26 / Next.js 14 (App Router)

**Primary Dependencies**: React 18, Tailwind CSS v4, shadcn/ui (Dialog, Button, Skeleton already installed), Lucide React, `node:sqlite` DatabaseSync

**Storage**: SQLite via `node:sqlite` `DatabaseSync` — existing `orders` and `products` tables; no schema changes required

**Testing**: Playwright (`@playwright/test`) for E2E — `workers: 1`, shared SQLite DB, RSC interception via `page.route()` for skeleton tests

**Target Platform**: Web (Next.js SSR + client hydration), desktop-first with mobile support down to 375 px viewport

**Project Type**: Next.js 14 App Router web application

**Performance Goals**:
- Calendar page initial load: < 2 s (SC-001)
- Month navigation (client-side state change): < 100 ms (client `useState`, no network)
- Dialog metadata visible: < 500 ms after chip click (SC-002, data already in memory)
- Dialog products visible: < 1 s (single lazy `/api/products` fetch)

**Constraints**:
- `staleTimes: { dynamic: 0 }` in `next.config.js` MUST NOT change
- `export const dynamic = 'force-dynamic'` MUST be on `src/app/calendar/page.js`
- No new npm packages — use native `Date` + `Intl.DateTimeFormat('ro-RO')` for calendar math
- `node:sqlite` DatabaseSync is synchronous — MUST NOT be changed to async
- `getDb()` singleton must be used for all DB access

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| Code Quality | PASS | Follows existing naming, file organisation, and component patterns |
| Testing Standards | PASS | Playwright E2E tests cover all 3 user stories before merge |
| UX Consistency | PASS | Uses existing shadcn Dialog + Button + Skeleton; Tailwind design tokens only |
| Performance | PASS | Client-side month nav (instant); lazy product fetch; SSR order data via RSC |
| Accessibility | PASS | Radix Dialog has native focus trap + Escape; skeleton has role="status"; nav buttons keyboard accessible |
| No Placeholders | PASS | All tasks in tasks.md specify exact files and code structure |

## Project Structure

### Documentation (this feature)

```text
specs/011-orders-calendar/
├── plan.md              ← this file
├── research.md          ← Phase 0: technology and architecture decisions
├── data-model.md        ← derived CalendarEvent/CalendarDay objects; existing DB fields
├── quickstart.md        ← 8 validation scenarios with steps and expected outcomes
├── contracts/
│   └── ui-contracts.md  ← CalendarGrid, EventChip, OrderDetailDialog props + API contracts
└── tasks.md             ← /speckit-tasks output (not yet created)
```

### Source Code (repository root)

```text
src/
├── app/
│   └── calendar/
│       ├── page.js                  ← RSC: force-dynamic, Suspense, calls getAllWithStatus()
│       └── loading.js               ← Suspense skeleton boundary (imports CalendarSkeleton)
├── components/
│   ├── calendar/
│   │   ├── CalendarGrid.jsx         ← 'use client': useState month, grid render, chip render
│   │   └── OrderDetailDialog.jsx    ← 'use client': shadcn Dialog, lazy product fetch
│   └── skeletons/
│       └── CalendarSkeleton.jsx     ← skeleton grid (role="status", aria-label="Se încarcă…")
└── lib/
    └── navigation.js                ← add { label: 'Calendar', href: '/calendar' }

tests/
└── e2e/
    └── calendar.spec.js             ← Playwright: US1 (grid + chips), US2 (dialog), US3 (nav)
```

**Structure Decision**: Next.js App Router, single project. All files follow conventions established by Dashboard (feature 010) and Suspense streaming (feature 001). No new top-level directories.

## Implementation Notes

### Calendar Math (pure native JS — no library)

```js
const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
// Monday-first offset: JS getDay() returns 0=Sun; map to Mon=0..Sun=6
const startOffset = (y, m) => (new Date(y, m, 1).getDay() + 6) % 7;
// Grid = 6 rows × 7 cols = 42 cells; fill with prev/next month padding days
```

### CalendarEvent Derivation

For each order in `orders[]` (passed from RSC to CalendarGrid):
- If `order.eventDate` non-null → `{ order, date: order.eventDate, type: 'eveniment' }`
- If `order.deliveryDate` non-null → `{ order, date: order.deliveryDate, type: 'livrare' }`

Filter to events where `date` matches the displayed `YYYY-MM`. Group into `Map<string, CalendarEvent[]>` keyed by `date`.

### Chip Styles

| Type | Tailwind classes |
|------|-----------------|
| `eveniment` | `bg-blue-100 text-blue-800 border border-blue-200` |
| `livrare`   | `bg-amber-100 text-amber-700 border border-amber-200` |

Name truncation: 22 chars max + "…" (consistent with TopProductsChart).

### setImmediate Suspension Pattern

```js
// page.js — enables reliable Suspense skeleton during RSC navigation
async function CalendarData() {
  await new Promise((resolve) => setImmediate(resolve));
  const orders = getAllWithStatus();
  return <CalendarGrid orders={orders} />;
}
```

### Product Status Romanian Labels

| DB value         | Display label    |
|------------------|-----------------|
| `de_facut`       | De făcut        |
| `in_design`      | În design       |
| `validare_client`| Validare client |
| `printare`       | Printare        |
| `asamblare`      | Asamblare       |
| `gata`           | Gata            |

### E2E Pattern

Follows `tests/e2e/dashboard.spec.js` conventions:
- `seedOrder(request, name, fields)` with `eventDate` / `deliveryDate` fields
- `clearOrders(request)` before each test block
- `delayCalendarRSC(page)` via `page.route()` + `rsc: 1` header for skeleton test
