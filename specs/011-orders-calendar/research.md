# Research: Orders Calendar

## Decision 1 — Calendar Grid: Pure Native JS (No New Library)

**Decision**: Build the monthly grid from scratch using native `Date` APIs.

**Rationale**: A monthly calendar requires three primitives — days in month, first-weekday of month (Mon-first offset), and generating a 6-row × 7-col grid. This is ≈25 lines of utility JS. No external library reduces bundle size, avoids a new dependency security review, and keeps the implementation inside the existing Tailwind + shadcn design system.

**Alternatives considered**:
- `react-calendar` / `react-big-calendar`: full calendar libraries; overkill for a display-only monthly grid, add 50–200 kB, opinionated styles that conflict with Tailwind v4.
- `date-fns`: excellent utility functions but ~100 kB for the subset we need (`startOfMonth`, `endOfMonth`, `getDay`). Native `Date` is sufficient.
- `dayjs`: 2 kB gzipped; reasonable alternative, but still an extra dependency for 25 lines of math.

**Conclusion**: No new npm dependency needed.

---

## Decision 2 — Romanian Date Formatting: `Intl.DateTimeFormat`

**Decision**: Use `Intl.DateTimeFormat('ro-RO', { month: 'long', year: 'numeric' })` and `{ weekday: 'short' }` for all locale-aware date strings. Use `.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })` for chip dates.

**Rationale**: The `Intl` API is built into every modern JS runtime (Node.js 14+ and all browsers); zero additional code needed. It returns "iulie 2026", "Lun", "Mar" etc. out of the box for the `ro-RO` locale.

**Alternatives considered**:
- Hardcoded Romanian string arrays (as done in `analytics.js` for abbreviated month names): works but duplicates locale logic and must be maintained manually.
- `date-fns/locale/ro`: requires the `date-fns` package — rejected for same reason as Decision 1.

---

## Decision 3 — Month Navigation: Client-Side `useState`

**Decision**: The Calendar page RSC loads all orders once. Month navigation is managed in a `CalendarGrid` Client Component via `useState({ year, month })`. No URL params, no server round-trips on month change.

**Rationale**:
- Month navigation must be instant (< 100 ms) — server round-trips would add 200–600 ms per click.
- Order data is small (< 1 000 rows for this app scale); loading all at once is fine.
- URL params would expose month state in the address bar without meaningful benefit (no sharing/bookmarking required per spec).
- Aligns with existing pattern: the Dashboard page also fetches all data server-side and delegates interactivity to Client Components.

**Alternatives considered**:
- URL `?month=2026-07` + server re-render: enables bookmarking, but adds latency on every month change. Rejected — spec SC-001 targets < 2 s page load; month switching is post-load interaction.
- Client-side fetch (`/api/orders` in `useEffect`): adds an extra waterfall + loading state for every mount. RSC fetch is simpler and already server-authoritative.

---

## Decision 4 — Products in Dialog: Lazy Fetch on Open

**Decision**: When the user clicks an event chip, the dialog opens immediately showing order metadata (already loaded). Products are fetched lazily via `GET /api/products?orderId=xxx` as a `useEffect` inside the dialog.

**Rationale**:
- `getAllWithStatus()` does NOT return product lists — it returns counts (`productCount`, `doneCount`). Products need a separate query.
- Pre-fetching products for all orders at page load would require N+1 queries (one per order). Lazy fetch on dialog open means only one query per user interaction.
- The `/api/products?orderId=xxx` endpoint already exists and returns exactly the required fields.
- Perceived performance is acceptable: order metadata (name, client, etc.) is shown instantly; products appear within ~150 ms of dialog open.

**Alternatives considered**:
- Eager load all products: expensive for many orders; most are never clicked.
- Add a new SQL query in `analytics.js` or `orders.js` to return products grouped by order: possible but creates a different API surface than the rest of the app.

---

## Decision 5 — Architecture: RSC Page + Client CalendarGrid

**Decision**: Follow the established Avify pattern from the Dashboard feature:

```
src/app/calendar/page.js         RSC, force-dynamic, Suspense wrapper
  └─ <CalendarData />            async RSC, calls getAllWithStatus(), passes orders[]
       └─ <CalendarGrid />       'use client', useState month, renders grid
            └─ <EventChip />     sub-component (can be inline in CalendarGrid)
            └─ <OrderDetailDialog />  'use client', lazy product fetch
```

`src/app/calendar/loading.js` provides the Suspense skeleton.

**Rationale**: Consistent with Dashboard pattern established in feature 010. RSC handles data fetch + streaming; client components handle interactivity (month nav, dialog). `setImmediate` suspension trick ensures the skeleton is visible during navigation (required by E2E tests pattern from feature 001).

**Alternatives considered**:
- Full client-side page: loses SSR, requires `useEffect` waterfall for order data.
- Full RSC page with no client interactivity: impossible — month navigation and dialog require client state.

---

## Decision 6 — Chip Visual Differentiation

**Decision**: Two distinct chip styles using Tailwind colour utilities within the existing design token system:
- `event_date` chips: blue tones (`bg-blue-100 text-blue-800 border-blue-200`) with label "Ev:" prefix
- `delivery_date` chips: amber tones (`bg-amber-100 text-amber-700 border-amber-200`) with label "Liv:" prefix

**Rationale**: The existing shadcn Badge variants are `default`, `secondary`, `destructive`, `outline`. Neither maps cleanly to "event" vs "delivery" semantics. Direct Tailwind colour classes give explicit control without adding custom Badge variants, consistent with how the rest of the app customises components.

---

## No New Database Tables or Migrations Required

All fields needed (`event_date`, `delivery_date`, `client`, `county`, `contact_platform`, `advance`, `profit`, `collected`, `delivered`) are already present in the `orders` table via the existing migrations in `db.js`. Product fields (`name`, `status`, `quantity`, `unit_price`) are already in `products`. Zero schema changes.
