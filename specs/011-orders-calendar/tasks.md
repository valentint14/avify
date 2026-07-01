# Tasks: Orders Calendar

**Input**: Design documents from `specs/011-orders-calendar/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | quickstart.md ✅ | contracts/ui-contracts.md ✅

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependency conflicts)
- **[Story]**: Which user story this task belongs to (US1 / US2 / US3)
- Exact file paths are included in all descriptions

---

## Phase 1: Setup

**Purpose**: Add the Calendar navigation link — required before any page can be reached from the nav bar.

- [ ] T001 Modify `src/lib/navigation.js` — add `{ label: 'Calendar', href: '/calendar' }` as the fifth entry in the `NAV_LINKS` array, after `{ label: 'Dashboard', href: '/dashboard' }`

**Checkpoint**: `/calendar` is now reachable from the nav bar once the page exists. All subsequent tasks can proceed.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Skeleton component and loading boundary required by US1 Suspense streaming. Both are shared infrastructure used by the page before data loads.

- [ ] T002 [P] Create `src/components/skeletons/CalendarSkeleton.jsx` — import `Skeleton` from `@/components/ui/skeleton`; outer `div` with `role="status"` `aria-label="Se încarcă…"` `className="mx-auto max-w-6xl p-6 flex flex-col gap-4"`; render: (1) a `div className="flex items-center justify-between"` containing `<Skeleton className="h-8 w-48 rounded" />` (month heading placeholder) and `<div className="flex gap-2">` with three `<Skeleton className="h-9 w-24 rounded" />` (nav button placeholders); (2) a `div className="grid grid-cols-7 gap-1 mt-2"` with 7 `<Skeleton className="h-6 rounded" />` (weekday header row); (3) a `div className="grid grid-cols-7 gap-1"` with 35 `<Skeleton className="h-20 rounded" />` (day cell placeholders); export as default

- [ ] T003 Create `src/app/calendar/loading.js` — import `CalendarSkeleton` from `@/components/skeletons/CalendarSkeleton`; export default `function Loading() { return <CalendarSkeleton />; }` (requires T002)

**Checkpoint**: Skeleton and loading boundary exist. US1 implementation can begin.

---

## Phase 3: User Story 1 — Monthly Calendar Grid with Event Chips (Priority: P1) 🎯 MVP

**Goal**: A `/calendar` page reachable from the nav bar shows the current month in a 7-column grid. Each order with a non-null `event_date` appears as a blue chip on the correct day; each order with a non-null `delivery_date` appears as an amber chip. Orders without either date are invisible on the calendar. The Suspense skeleton is shown during page load.

**Independent Test**: Navigate to `/calendar` with at least one seeded order that has `event_date = today`. A blue chip labelled "Ev: [order name]" must appear on today's cell. A second order with `delivery_date = today` must show an amber chip "Liv: [order name]".

- [ ] T004 [P] [US1] Create `src/components/calendar/CalendarGrid.jsx` — `'use client'`; import `{ useState }` from `'react'`; component accepts prop `orders` (`Array<Order>`); initialise `const [{ year, month }, setYearMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; })`; include two inline helpers: `const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate()` and `const startOffset = (y, m) => (new Date(y, m, 1).getDay() + 6) % 7` (maps JS getDay() to Monday-first: Mon=0, Sun=6); derive `events` array from `orders`: iterate all orders, if `order.eventDate` push `{ order, date: order.eventDate, type: 'eveniment' }`, if `order.deliveryDate` push `{ order, date: order.deliveryDate, type: 'livrare' }`; build `isoPrefix = \`\${year}-\${String(month+1).padStart(2,'0')}\``; filter events to `e.date.startsWith(isoPrefix)`; group into `const eventsByDate = new Map()` keyed by `e.date` (array values); build the 42-cell grid array: pad `startOffset(year, month)` cells for previous month (mark `isCurrentMonth: false`), then days 1–`daysInMonth(year, month)` (mark `isCurrentMonth: true`), then fill remaining to reach 42 cells with next-month padding (mark `isCurrentMonth: false`); compute `const todayISO = new Date().toISOString().slice(0, 10)`; render: (1) outer `<div className="mx-auto max-w-6xl p-6">` containing: (2) `<div className="flex items-center justify-between mb-4">` with `<h1 className="text-2xl font-bold tracking-tight capitalize">{Intl.DateTimeFormat('ro-RO', { month: 'long', year: 'numeric' }).format(new Date(year, month))}</h1>` and a nav button placeholder `<div />` (buttons added in T010); (3) `<div className="grid grid-cols-7 gap-1 mb-1">` with headers `['Lun','Mar','Mie','Joi','Vin','Sâm','Dum'].map(d => <div className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>)`; (4) `<div className="grid grid-cols-7 gap-1">` with one `<div>` per grid cell: if `!cell.isCurrentMonth` render `<div className="h-20 rounded-lg bg-muted/30 p-1" />`; if `cell.isCurrentMonth` render `<div className="h-20 rounded-lg border border-border bg-card p-1 overflow-hidden">` containing: `<span className="text-xs font-semibold {cell.dateISO === todayISO ? 'text-primary' : 'text-foreground'}">{cell.day}</span>` and event chips: get `const cellEvents = eventsByDate.get(cell.dateISO) ?? []`; render first 3 chips; chip container: `<button onClick={() => {}} className="w-full text-left text-xs px-1.5 py-0.5 rounded truncate border ...chip-style...">`; chip style for `eveniment`: `bg-blue-100 text-blue-800 border-blue-200`; chip style for `livrare`: `bg-amber-100 text-amber-700 border-amber-200`; chip text: `` `${e.type === 'eveniment' ? 'Ev' : 'Liv'}: ${e.order.name.length > 22 ? e.order.name.slice(0, 22) + '…' : e.order.name}` ``; if `cellEvents.length > 3` render `<span className="text-xs text-muted-foreground pl-1">+{cellEvents.length - 3} alte</span>`; export as default

- [ ] T005 [US1] Create `src/app/calendar/page.js` — import `{ Suspense }` from `'react'`; import `CalendarSkeleton` from `'@/components/skeletons/CalendarSkeleton'`; import `CalendarGrid` from `'@/components/calendar/CalendarGrid'`; import `{ getAllWithStatus }` from `'@/lib/orders'`; `export const metadata = { title: 'Calendar — Avify' }`; `export const dynamic = 'force-dynamic'`; default export `function Page() { return <Suspense fallback={<CalendarSkeleton />}><CalendarData /></Suspense>; }`; `async function CalendarData() { await new Promise((resolve) => setImmediate(resolve)); const orders = getAllWithStatus(); return <CalendarGrid orders={orders} />; }` (requires T002, T003, T004)

- [ ] T006 [US1] Create `tests/e2e/calendar.spec.js` — import `{ test, expect }` from `'@playwright/test'`; define `const NAV = 'nav[aria-label="Navigare principală"]'`; define helpers: `async function clearOrders(request) { const { orders } = await (await request.get('/api/orders')).json(); await Promise.all(orders.map((o) => request.delete(\`/api/orders/\${o.id}\`))); }`, `async function seedOrder(request, name, fields = {}) { const { order } = await (await request.post('/api/orders', { data: { name, ...fields } })).json(); return order; }`, `async function delayCalendarRSC(page, ms = 800) { await page.route('http://localhost:3000/calendar', async (route, request) => { if (request.headers()['rsc'] === '1') await new Promise(r => setTimeout(r, ms)); await route.continue(); }); }`; write describe block `'Feature 011 — calendar: US1 monthly grid'` with tests: (1) `'Calendar nav link is visible and navigates to /calendar'` — `page.goto('/')`, click nav link "Calendar", `expect(page).toHaveURL('/calendar')`, `expect(page.locator('h1')).toBeVisible()`; (2) `'Monthly grid renders with Romanian weekday headers'` — `page.goto('/calendar')`, assert the 7 weekday texts Lun, Mar, Mie, Joi, Vin, Sâm, Dum are each visible; (3) `'Orders with event_date appear as blue chips'` — `clearOrders`, seed order with `eventDate: new Date().toISOString().slice(0, 10)`, `page.goto('/calendar')`, `expect(page.locator('.bg-blue-100').first()).toBeVisible({ timeout: 8000 })`, `clearOrders`; (4) `'Orders with delivery_date appear as amber chips'` — same pattern with `deliveryDate` and `.bg-amber-100`; (5) `'Loading skeleton appears during SPA navigation to /calendar'` — `delayCalendarRSC(page)`, `page.goto('/')`, click "Calendar" nav link, `expect(page.locator('[role="status"][aria-label="Se încarcă…"]')).toBeVisible({ timeout: 5000 })`, `page.unrouteAll()` (requires T005)

**Checkpoint**: `/calendar` is reachable from nav bar. Current-month grid renders with chips for seeded orders. Suspense skeleton visible during navigation. US1 independently complete.

---

## Phase 4: User Story 2 — Order Detail Dialog on Chip Click (Priority: P2)

**Goal**: Clicking any event chip opens a shadcn Dialog immediately showing order metadata (name, client, county, contact platform, event date, delivery date, advance, profit, collected/delivered). A product list is fetched lazily and shown in the same dialog (with a skeleton during load). Dialog closes on Escape, backdrop click, or "Închide" button.

**Independent Test**: Seed one order with `event_date = today`, navigate to `/calendar`, click the chip. Dialog must open within 500 ms with the order name visible. Dialog must show a product list (or "nu are produse" if empty) within 1 second. Pressing Escape must close the dialog.

- [ ] T007 [P] [US2] Create `src/components/calendar/OrderDetailDialog.jsx` — `'use client'`; imports: `{ useState, useEffect }` from `'react'`; `{ Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose }` from `'@/components/ui/dialog'`; `{ Button }` from `'@/components/ui/button'`; `{ Skeleton }` from `'@/components/ui/skeleton'`; define `const STATUS_LABELS = { de_facut: 'De făcut', in_design: 'În design', validare_client: 'Validare client', printare: 'Printare', asamblare: 'Asamblare', gata: 'Gata' }`; component accepts `{ event, onClose }` where `event` is `{ order, date, type } | null`; `const open = event !== null`; `const [products, setProducts] = useState(null)`; `const [loadingProducts, setLoadingProducts] = useState(false)`; `useEffect(() => { if (!event) { setProducts(null); return; } setLoadingProducts(true); fetch(\`/api/products?orderId=\${event.order.id}\`).then(r => r.json()).then(({ products: p }) => { setProducts(p); setLoadingProducts(false); }); }, [event?.order?.id])`; return `<Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>` → `<DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">`; `<DialogHeader>`: `<DialogTitle>{event?.order?.name ?? ''}</DialogTitle>`; `<DialogDescription asChild>` containing a `<div>` with: type badge — if `event?.type === 'eveniment'` render `<span className="inline-block bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded">Eveniment</span>` else `<span className="inline-block bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5 rounded">Livrare</span>`; then order metadata `<dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">` with `<dt className="text-muted-foreground">` / `<dd className="font-medium">` pairs for (only render if value is non-null / non-zero / non-empty): Client → `event?.order?.client`, Județ → `event?.order?.county`, Platformă → `event?.order?.contactPlatform`, Dată eveniment → `event?.order?.eventDate`, Termen livrare → `event?.order?.deliveryDate`, Avans → `` `${event?.order?.advance} RON` `` (if advance > 0), Profit → `` `${event?.order?.profit} RON` `` (if profit > 0), Colectat → `event?.order?.collected ? 'Da' : 'Nu'`, Livrat → `event?.order?.delivered ? 'Da' : 'Nu'`; then products section: `<h3 className="mt-4 mb-2 text-sm font-semibold">Produse</h3>`; if `loadingProducts`: render 3 `<Skeleton className="h-5 w-full my-1" />`; else if `products?.length === 0`: `<p className="text-sm text-muted-foreground">Această comandă nu are produse.</p>`; else `<ul className="space-y-1">` with each product as `<li className="flex justify-between text-sm border-b border-border py-1 last:border-0"><span>{p.name} <span className="text-muted-foreground text-xs">({STATUS_LABELS[p.status] ?? p.status})</span></span><span className="text-muted-foreground">{p.quantity} × {p.unitPrice} RON</span></li>`; `<DialogFooter className="mt-4">` → `<DialogClose asChild><Button variant="outline">Închide</Button></DialogClose>`; export as default

- [ ] T008 [US2] Modify `src/components/calendar/CalendarGrid.jsx` — add `import OrderDetailDialog from '@/components/calendar/OrderDetailDialog'` at top; add state `const [selectedEvent, setSelectedEvent] = useState(null)` (add `useState` to existing import from react); update every chip's `onClick` from `() => {}` to `() => setSelectedEvent(e)` where `e` is the CalendarEvent for that chip; add `<OrderDetailDialog event={selectedEvent} onClose={() => setSelectedEvent(null)} />` as the last element inside the outer `<div>` (after the grid), before the closing tag; export remains default (requires T007)

- [ ] T009 [US2] Add US2 test block to `tests/e2e/calendar.spec.js` — add `test.describe('Feature 011 — calendar: US2 order detail dialog', () => { test.beforeEach(async ({ request }) => { await clearOrders(request); }); })` with tests: (1) `'Clicking a chip opens the order detail dialog'` — seed order with eventDate=today (name "Comanda Dialog Test"), `page.goto('/calendar')`, await chip `.bg-blue-100` visible, click it, `expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 })`, `expect(page.locator('[role="dialog"]')).toContainText('Comanda Dialog Test')`; (2) `'Dialog shows order metadata including client'` — seed order with `{ eventDate: today, client: 'Client Test Calendar' }`, goto calendar, click chip, await dialog visible, `expect(page.locator('[role="dialog"]')).toContainText('Client Test Calendar')`; (3) `'Dialog closes on Escape key'` — seed order with eventDate=today, goto calendar, click chip, await dialog visible, `page.keyboard.press('Escape')`, `expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3000 })`; (4) `'Dialog shows products section'` — seed order with eventDate=today, goto calendar, click chip, await dialog, await for either product list or text "não" appearing — specifically `expect(page.locator('[role="dialog"]')).toContainText(/Produse|nu are produse/i, { timeout: 5000 })`; also verify the `<h3>` heading "Produse" is present (requires T008)

**Checkpoint**: Clicking any chip opens a dialog with order details and products. US2 independently complete alongside US1.

---

## Phase 5: User Story 3 — Month Navigation (Priority: P3)

**Goal**: Three controls — "Luna anterioară", "Azi", "Luna următoare" — let users browse to any month. The heading always shows the displayed month and year. The calendar re-renders with the correct events for the navigated month.

**Independent Test**: Click "Luna următoare" twice, then "Azi". The heading must return to the current month. Seed an order with `event_date` two months in the future and confirm the chip only appears after navigating forward.

- [ ] T010 [US3] Modify `src/components/calendar/CalendarGrid.jsx` — replace the nav button placeholder `<div />` with `<div className="flex items-center gap-2">`; add three `<Button>` elements using `Button` from `@/components/ui/button` (add import if not already present): "Luna anterioară" with `variant="outline" size="sm"` and `onClick={() => setYearMonth(({ year: y, month: m }) => m === 0 ? { year: y - 1, month: 11 } : { year: y, month: m - 1 })}`, "Azi" with `variant="ghost" size="sm"` and `onClick={() => setYearMonth({ year: new Date().getFullYear(), month: new Date().getMonth() })}`, "Luna următoare" with `variant="outline" size="sm"` and `onClick={() => setYearMonth(({ year: y, month: m }) => m === 11 ? { year: y + 1, month: 0 } : { year: y, month: m + 1 })}`; all buttons must have `type="button"` to prevent any accidental form submission; no other changes to CalendarGrid (requires T004 and T008 complete)

- [ ] T011 [US3] Add US3 test block to `tests/e2e/calendar.spec.js` — add `test.describe('Feature 011 — calendar: US3 month navigation', () => {})` with tests: (1) `'Luna anterioară button navigates to previous month'` — `page.goto('/calendar')`, get text of h1 as `beforeText`, click button "Luna anterioară", `expect(page.locator('h1')).not.toHaveText(beforeText, { timeout: 2000 })`; (2) `'Azi button returns to current month'` — `page.goto('/calendar')`, click "Luna următoare" twice, click "Azi", assert h1 contains current month name (computed with `Intl.DateTimeFormat('ro-RO', { month: 'long' }).format(new Date())`) using `toContainText`; (3) `'Order with next-month event_date appears after navigation'` — clearOrders, seed order with eventDate set to first day of next month (`new Date(y, m+1, 1).toISOString().slice(0,10)`), `page.goto('/calendar')`, verify `.bg-blue-100` NOT visible (wrong month), click "Luna următoare", `expect(page.locator('.bg-blue-100').first()).toBeVisible({ timeout: 5000 })`, clearOrders; (4) `'Empty month shows grid without errors'` — navigate several months into the future, verify no `.bg-blue-100` and no `.bg-amber-100` and no error visible (requires T010)

**Checkpoint**: All three user stories complete. Full calendar feature functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Build verification and manual validation.

- [ ] T012 [P] Run `npm run build` from repo root and confirm clean output — no import errors for new components; `/calendar` route shows as `ƒ (Dynamic)`; fix any JSX or module resolution issues found

- [ ] T013 [P] Manually run quickstart.md Scenarios 1–8 against dev server (`npm run dev`) — verify: nav link works, chips appear on correct days, chip colours are distinct, dialog opens within 500 ms, products load, dialog closes, month navigation is instant, skeleton visible on slow connection, overflow "+N alte" shown for days with 4+ events; note any visual issues (mobile layout, long names) as follow-ups

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Requires T001; T002 runs first, T003 depends on T002
- **Phase 3 (US1)**: Requires Phase 2; T004 can run parallel with T003 (different files); T005 requires T003 + T004; T006 requires T005
- **Phase 4 (US2)**: Requires Phase 3; T007 can run parallel with T006 (different files); T008 requires T007; T009 requires T008
- **Phase 5 (US3)**: Requires Phase 4; T010 modifies CalendarGrid (requires T008); T011 requires T010
- **Phase 6 (Polish)**: Requires Phase 5; T012 and T013 are parallel

### Within Phase 3

```
T004 (CalendarGrid) ──┐
T003 (loading.js)   ──┤─── T005 (page.js) ──── T006 (E2E US1)
```

### Within Phase 4

```
T007 (Dialog) ──── T008 (wire Dialog into Grid) ──── T009 (E2E US2)
```

### Parallel Opportunities

- T002 (CalendarSkeleton) and T004 (CalendarGrid): different files, no shared dependency
- T007 (OrderDetailDialog) and Phase 3 E2E tests (T006): different files, can run while T006 runs
- T012 and T013 (polish): fully parallel

---

## Parallel Example: Phase 4

```
While T006 (US1 E2E) is running:
  Task T007: "Create OrderDetailDialog.jsx"  ← different file, no conflict
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (T001) and Phase 2 (T002–T003)
2. Complete Phase 3 (T004–T006)
3. **STOP and VALIDATE**: Navigate to `http://localhost:3000/calendar` — Calendar link in nav, monthly grid visible, chips for seeded orders appear, skeleton visible on load
4. Feature is independently useful and shippable as-is (current month only, no dialog, no nav)

### Incremental Delivery

1. **Phase 1 + 2** → Nav link + shared skeleton infrastructure
2. **Phase 3 (US1)** → `/calendar` page live with chip grid (MVP)
3. **Phase 4 (US2)** → Dialog on chip click — full order details and products
4. **Phase 5 (US3)** → Month navigation — prev/next/today buttons
5. **Phase 6** → Build verified; quickstart scenarios confirmed

---

## Notes

- `[P]` tasks = different files, no incomplete dependencies — safe to run concurrently
- `export const dynamic = 'force-dynamic'` MUST be on `src/app/calendar/page.js`
- CalendarGrid MUST be `'use client'` — it uses `useState` for month state
- OrderDetailDialog MUST be `'use client'` — it uses `useState`, `useEffect`, and fetch
- CalendarSkeleton is a Server Component (no interactivity) — do NOT add `'use client'`
- `setImmediate` in `CalendarData()` follows the established pattern from features 001 and 010
- `next.config.js` (`staleTimes: { dynamic: 0 }`) MUST NOT change
- E2E tests follow seeding/cleanup pattern from `tests/e2e/dashboard.spec.js`
- Calendar uses Monday-first week (Romanian convention): `(getDay() + 6) % 7`
- `Intl.DateTimeFormat('ro-RO', { month: 'long', year: 'numeric' })` returns lowercase in Romanian (e.g., "iulie 2026") — capitalise first letter in the heading with `.replace(/^\w/, c => c.toUpperCase())`
