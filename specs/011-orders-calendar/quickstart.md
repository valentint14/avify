# Quickstart: Orders Calendar — Validation Guide

## Prerequisites

- Dev server running: `npm run dev` (port 3000)
- At least one order seeded with `event_date` or `delivery_date` set
  - Use `npm run seed:fresh` to populate realistic data, or seed manually via the Comenzi page
- Playwright installed: `npm install` (already done)

---

## Scenario 1 — US1: Calendar page visible from nav (P1 MVP)

**Goal**: Confirm the Calendar page is reachable and renders the current month grid.

```bash
# Start dev server
npm run dev
```

1. Open `http://localhost:3000`
2. Click "Calendar" in the top navigation bar
3. Verify URL changes to `/calendar`
4. Verify a monthly grid is displayed with the current month heading (e.g., "Iulie 2026")
5. Verify 7 column headers are visible: Lun, Mar, Mie, Joi, Vin, Sâm, Dum

**Expected outcome**: Page loads within 2 seconds; grid is visible with day cells numbered correctly.

---

## Scenario 2 — US1: Orders appear as events on correct days

**Goal**: Confirm orders with `event_date` and `delivery_date` appear on the calendar.

**Setup** (using seed data from `npm run seed:fresh`):
- Verify that the current month contains at least one seeded order (seed spreads orders across 12 months)
- Navigate to that month using "Luna anterioară" / "Luna următoare" if needed

**Steps**:
1. Navigate to `/calendar`
2. Locate a day cell with a seeded order's `event_date`
3. Verify a **blue** chip labelled "Ev: [order name]" appears on that day
4. Locate a day cell with a seeded order's `delivery_date`
5. Verify an **amber** chip labelled "Liv: [order name]" appears on that day

**Expected outcome**: Both chip types visible; colours are visually distinct; order names are readable (truncated with "…" if long).

---

## Scenario 3 — US1: Empty month shows no events

**Goal**: Confirm no crash or error when navigating to a month with no orders.

**Steps**:
1. Navigate to `/calendar`
2. Click "Luna următoare" several times until reaching a month 2+ years in the future
3. Verify the grid renders normally with no chips
4. Verify no error message or console error appears

**Expected outcome**: Empty grid renders without errors.

---

## Scenario 4 — US2: Click event opens order detail dialog

**Goal**: Confirm the dialog opens with correct order details and products.

**Steps**:
1. Navigate to `/calendar` and find a day with at least one event chip
2. Click the chip
3. Verify a dialog opens within 500 ms
4. Verify the dialog shows: order name, client, county, dates, profit, advance, collected status, delivered status
5. Verify the dialog shows a product list (or loading skeleton, then product list)
6. Verify each product row shows name, status, quantity, unit price
7. Press Escape — verify dialog closes and calendar is still visible
8. Click another chip — verify dialog opens again for the new order

**Expected outcome**: Dialog opens instantly; products load within 1 second; dialog closes cleanly.

---

## Scenario 5 — US2: Dialog event type label

**Goal**: Confirm the dialog header indicates whether the click came from an "Eveniment" or "Livrare" chip.

**Setup**: Find an order that has both `event_date` and `delivery_date` set.

**Steps**:
1. Click the blue "Ev:" chip for the order
2. Verify the dialog header shows a blue badge with "Eveniment"
3. Close the dialog
4. Click the amber "Liv:" chip for the same order (may be on a different day)
5. Verify the dialog header shows an amber badge with "Livrare"

**Expected outcome**: Badge colour and label change correctly depending on which chip was clicked.

---

## Scenario 6 — US3: Month navigation

**Goal**: Confirm prev/next/today buttons work correctly.

**Steps**:
1. Navigate to `/calendar` — note the current month heading
2. Click "Luna anterioară" — verify heading changes to previous month
3. Click "Luna anterioară" again — verify heading changes again
4. Click "Azi" — verify heading returns to the current month
5. Click "Luna următoare" twice — verify heading advances two months
6. Click "Azi" — verify return to current month

**Expected outcome**: Navigation is instant (< 100 ms), heading updates correctly, events refresh for each month.

---

## Scenario 7 — US1: Loading skeleton appears during navigation

**Goal**: Confirm the Suspense skeleton is shown while the page data loads.

**Steps** (requires a slow network or throttling):
1. In browser DevTools → Network → set throttling to "Slow 3G"
2. Navigate from another page (e.g., Comenzi) to Calendar via the nav link
3. Verify a skeleton grid is visible before the real calendar appears
4. Disable throttling

**Expected outcome**: Skeleton renders during load; no flash of empty content.

---

## Scenario 8 — Overflow (3+ events on same day)

**Goal**: Confirm the "+N alte" indicator appears when a day has more than 3 events.

**Setup**: Manually create 4+ orders with the same `event_date` (or use `npm run seed:fresh` and find a busy day).

**Steps**:
1. Navigate to `/calendar` and find a day with 4+ events
2. Verify exactly 3 chips are visible
3. Verify a "+N alte" label appears below the third chip (where N = total − 3)
4. Verify clicking any of the 3 visible chips still opens the correct dialog

**Expected outcome**: Overflow indicator is visible; no events are permanently inaccessible (visible chips remain clickable).

---

## E2E Test Command

```bash
npx playwright test tests/e2e/calendar.spec.js
```

Tests cover: nav link, month grid render, event chips, dialog open/close, month navigation, skeleton, empty month.

---

## References

- UI Contracts: [contracts/ui-contracts.md](contracts/ui-contracts.md)
- Data Model: [data-model.md](data-model.md)
- Research decisions: [research.md](research.md)
