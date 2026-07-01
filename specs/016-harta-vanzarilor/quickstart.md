# Quickstart: Validating Harta Vânzărilor

**Feature**: 016-harta-vanzarilor
**Spec**: [spec.md](spec.md) | **Data Model**: [data-model.md](data-model.md) | **Contracts**: [contracts/analytics-api.md](contracts/analytics-api.md)

---

## Prerequisites

1. Node.js 26+ installed
2. Repository cloned, dependencies installed (`npm install`)
3. Seed data loaded with delivered orders in known counties (see step 1 below)

---

## Step 1 — Seed Test Data

```powershell
# Seed fresh DB with delivered orders across counties
node scripts/seed.js --fresh
```

After seeding, verify the DB has delivered orders in at least 3 different counties:

```powershell
node -e "
const { getDb } = require('./src/lib/db.js');
const db = getDb();
const rows = db.prepare(\"SELECT county, COUNT(*) as n FROM orders WHERE delivered=1 AND county IS NOT NULL GROUP BY county\").all();
console.log(rows);
"
```

**Expected**: At least 3 rows with different county values, e.g.:
```json
[
  { "county": "Cluj",  "n": 5  },
  { "county": "Iași",  "n": 2  },
  { "county": "Timiș", "n": 10 }
]
```

If the seed script does not populate `county`/`delivered`, manually insert:
```powershell
node -e "
const { getDb } = require('./src/lib/db.js');
const db = getDb();
db.prepare(\"UPDATE orders SET county='Cluj', delivered=1 WHERE id=(SELECT id FROM orders LIMIT 1)\").run();
"
```

---

## Step 2 — Start Dev Server

```powershell
npm run dev
```

Open browser at `http://localhost:3000/dashboard`.

---

## Step 3 — Validate: Harta Section Appears (FR-001)

**Expected**: A section titled **"Harta vânzărilor"** is visible below "Cele mai vândute produse". It contains:
- A Romania map outline (SVG)
- A metric toggle with two buttons: "Comenzi" and "Profit"

---

## Step 4 — Validate: County Color Coding (FR-004, FR-005)

1. Look at the counties known to have delivered orders from Step 1.
2. **Expected**: Those counties appear in a **blue shade** — distinct from gray counties.
3. Counties with no delivered orders (e.g., Vrancea if not seeded) appear in **light gray**.
4. The county with the highest count should appear **darkest blue**; lower-count counties appear lighter.

---

## Step 5 — Validate: Tooltip on Hover (FR-006)

1. Move the mouse cursor over a blue (active) county.
2. **Expected**: A tooltip appears with:
   - County name (e.g., "Cluj")
   - "12 comenzi livrate" (matching the seed count)
   - "4,320.50 RON" (matching the seeded profit sum)
3. Move the mouse over a gray (inactive) county.
4. **Expected**: Tooltip shows county name, "0 comenzi livrate", "0.00 RON".
5. Move mouse off the county.
6. **Expected**: Tooltip disappears.

---

## Step 6 — Validate: Metric Toggle (FR-009, US3)

1. Click the "Profit" button in the toggle.
2. **Expected**: County colors update immediately (no page reload).
3. Counties with higher total profit appear darker than those with lower profit.
4. Hover a county — tooltip still shows both counts and profit value.
5. Click "Comenzi" to switch back.
6. **Expected**: Colors revert to order-count-based intensity.

---

## Step 7 — Validate: Responsive Layout (FR-008, SC-005)

1. In Chrome DevTools, set viewport to 375×667 (iPhone SE).
2. Navigate to `/dashboard`.
3. **Expected**:
   - The map scales to fit the container width — no horizontal scroll bar.
   - Map is readable (counties visible, not clipped).
   - Metric toggle buttons are accessible.

---

## Step 8 — Validate: Empty State (Edge Case)

```powershell
# Temporarily mark all orders as not delivered
node -e "
const { getDb } = require('./src/lib/db.js');
const db = getDb();
db.prepare('UPDATE orders SET delivered = 0').run();
console.log('All orders marked as not delivered');
"
```

Reload `/dashboard`.
**Expected**: All counties appear in the neutral gray color; map is visible and no JavaScript errors in console.

Restore data: `node scripts/seed.js --fresh`

---

## Step 9 — Integration Test (analytics function)

```powershell
npm test -- --testPathPattern=analytics
```

**Expected**: All `getSalesMapData` tests pass:
- Returns empty array when no delivered orders exist
- Returns correct aggregates per county
- Excludes NULL/empty county values
- Handles orders with NULL profit (treats as 0)

---

## Step 10 — E2E Smoke Test

```powershell
npm run test:e2e -- --grep "harta"
```

**Expected**: All harta-related Playwright tests pass (map section visible, tooltip content, metric toggle, empty state).
