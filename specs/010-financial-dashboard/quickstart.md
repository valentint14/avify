# Quickstart & Validation Guide: Financial Dashboard

## Prerequisites

- Dev server running: `npm run dev` (http://localhost:3000)
- At least one order with products in the database (seed via the UI or API if empty)

## Scenario 1 — US1: Monthly Profit Chart Visible

**Goal**: Verify that the monthly profit chart renders with correct data.

**Setup** (API seeding if DB is empty):
```bash
# Create an order
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Order"}'
# Note the returned order id

# Set profit on the order (replace <id>)
curl -X PATCH http://localhost:3000/api/orders/<id> \
  -H "Content-Type: application/json" \
  -d '{"profit": 500}'
```

**Steps**:
1. Open http://localhost:3000/dashboard
2. Observe the page loads within 2 seconds

**Expected**:
- A section labelled with the current month shows profit data
- The chart X-axis shows Romanian month labels (e.g., "Iun 2026")
- The chart value for the seeded month equals the sum of `profit` values for orders in that month
- No blank or broken chart area

---

## Scenario 2 — US2: Top Products Ranking Visible

**Goal**: Verify the ranking chart shows products ordered by frequency.

**Setup**:
```bash
# Create a product template in the catalog
curl -X POST http://localhost:3000/api/catalog \
  -H "Content-Type: application/json" \
  -d '{"name": "Invitații Nuntă"}'
# Note template id

# Create orders and link that template
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"name": "Order A", "templateIds": ["<template-id>"]}'

curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"name": "Order B", "templateIds": ["<template-id>"]}'
```

**Steps**:
1. Open (or refresh) http://localhost:3000/dashboard
2. Scroll to the "Top produse" section

**Expected**:
- "Invitații Nuntă" appears in the ranking
- Its bar/count reflects the number of distinct orders it appears in (2 in this example)
- Products are sorted descending — the most frequently ordered product appears first

---

## Scenario 3 — US3: KPI Cards Show Correct Totals

**Goal**: Verify that the three summary cards show accurate aggregate values.

**Steps**:
1. Open http://localhost:3000/dashboard
2. Note the three KPI card values
3. Count orders manually via http://localhost:3000 (orders page)
4. Compare total order count with KPI card value

**Expected**:
- "Total Comenzi" matches the exact order count on the orders page
- "Venituri Totale" reflects sum of all product prices across all orders
- "Profit Total" reflects sum of `profit` fields across all orders (0 if none entered)

---

## Scenario 4 — Loading Skeleton

**Goal**: Verify the loading skeleton appears before content during SPA navigation.

**Steps**:
1. Open http://localhost:3000 (orders page)
2. Open DevTools → Network → throttle to Slow 3G
3. Click "Dashboard" in the navigation bar
4. Observe the transition

**Expected**:
- A skeleton placeholder (shimmer animation) appears immediately on click
- After data loads, skeleton is replaced by the actual charts and KPI cards
- No blank white screen at any point

---

## Scenario 5 — Empty State

**Goal**: Verify the dashboard renders gracefully with no data.

**Steps**:
1. Clear all orders: `DELETE /api/orders/<id>` for each order
2. Open http://localhost:3000/dashboard

**Expected**:
- KPI cards show 0 for all values
- Monthly profit chart area shows a friendly Romanian "no data" message
- Top products chart area shows a friendly Romanian "no data" message
- No JavaScript errors in the browser console

---

## Scenario 6 — Navigation Bar Entry

**Goal**: Verify Dashboard is reachable from the nav bar.

**Steps**:
1. Open any page (e.g., http://localhost:3000)
2. Locate the navigation bar

**Expected**:
- "Dashboard" link is visible in the navigation bar
- Clicking it navigates to http://localhost:3000/dashboard
- The Dashboard link is highlighted as active when on the dashboard page

---

## E2E Test Command

```bash
npx playwright test tests/e2e/dashboard.spec.js
```

See [data-model.md](./data-model.md) for exact data shapes validated by the tests.
