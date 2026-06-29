# Quickstart: Order Filters Validation

**Feature**: 007-order-filters
**Date**: 2026-06-29

---

## Prerequisites

- Node.js ≥ 22 installed
- Dependencies installed: `npm install`
- Dev server running: `npm run dev` (http://localhost:3000)
- At least 3 orders in the system with varied data:
  - At least 2 different counties
  - At least 2 different contact platforms
  - Mix of collected/uncollected and delivered/undelivered orders
  - At least 2 orders with distinct client names

---

## Scenario 1: Client Name Text Search (US1)

**Goal**: Verify the search bar filters orders by client name instantly.

1. Open the orders page at http://localhost:3000
2. Locate the filter panel above the order table
3. Type a partial client name (e.g., "ion") in the "Caută client" input
4. **Expected**: Only orders whose client contains "ion" (case-insensitive) are visible, updating with each character typed
5. Clear the search input
6. **Expected**: All orders are restored immediately

**Edge**: Type a string that matches no client → "Nicio comandă găsită pentru filtrele selectate." message appears.

---

## Scenario 2: County Dropdown Filter (US2)

**Goal**: Verify county dropdown narrows the order list.

1. Open the orders page
2. Select a specific county from the "Județ" dropdown
3. **Expected**: Only orders from that county are visible; result updates without page reload
4. Select "Toate județele"
5. **Expected**: All orders reappear

---

## Scenario 3: Contact Platform Dropdown Filter (US2)

**Goal**: Verify platform dropdown filter works independently.

1. Select a platform from "Platformă contact" dropdown
2. **Expected**: Only orders with that platform are visible
3. Reset to "Toate platformele"
4. **Expected**: All orders reappear

---

## Scenario 4: Collection Status Filter (US3)

**Goal**: Verify the Încasare status filter.

1. Select "Încasată" from the "Încasare" control
2. **Expected**: Only orders marked as collected (Încasată badge active) are shown
3. Select "Neîncasată"
4. **Expected**: Only uncollected orders are shown
5. Select "Toate"
6. **Expected**: All orders reappear

---

## Scenario 5: Delivery Status Filter (US3)

**Goal**: Verify the Livrare status filter.

1. Select "Livrată" from the "Livrare" control
2. **Expected**: Only delivered orders are shown
3. Select "Nelivrată" → only undelivered orders shown
4. Select "Toate" → all orders reappear

---

## Scenario 6: Combined Multi-Filter + Reset (US4)

**Goal**: Verify AND logic across all dimensions and the reset button.

1. Set "Caută client" to a partial name, select a county, select a platform, set Încasare to "Neîncasată", set Livrare to "Nelivrată"
2. **Expected**: Only orders matching ALL five active filters are visible (may be 0)
3. Click "Resetează filtrele"
4. **Expected**: All five filters return to default and the full order list is restored in a single click

---

## Automated Test Commands

```bash
# Unit tests (pure filter logic)
npm test -- --testPathPattern="orderFilters"

# E2E acceptance scenarios
npm run test:e2e -- --grep "order-filters"

# Full test suite with coverage
npm test -- --coverage
```

**Expected outcomes**:
- All unit tests for `src/lib/orderFilters.js` pass
- All 6 E2E scenarios pass
- `src/lib/` line coverage remains ≥ 80%
