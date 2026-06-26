# Quickstart & Validation Guide: Kanban Board for Stationery Order Management

**Feature**: `001-kanban-orders`
**Date**: 2026-06-25
**Spec**: [spec.md](spec.md) | **API**: [contracts/api.md](contracts/api.md) | **Data Model**: [data-model.md](data-model.md)

---

## Prerequisites

- Node.js 20 LTS
- npm 10+
- Chrome 120+, Firefox 120+, or Edge 120+ (desktop)

---

## Setup

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

Open `http://localhost:3000`.

The SQLite database file (`data/avify.db`) is created automatically on first run.
System product types (Invitații, Meniu, Program, etc.) are seeded on startup.

---

## Validation Scenarios

### User Story 1 — Create and Track a New Order (P1)

1. Open `http://localhost:3000`. Verify the board shows 6 empty columns.
2. Click **"Comandă nouă"**.
3. Fill in the form:
   - Nume client: `Andrei Popescu`
   - Partener: `Maria Popescu`
   - Dată eveniment: any future date
   - Tip eveniment: `Nuntă`
   - Produse: check `Invitații` and `Meniu`
   - Status plată: `Neachitat`
4. Click **"Salvează"**.

**Expected**: A card appears in **"De făcut"** showing "Andrei Popescu / Maria Popescu",
the selected event date, a Nuntă badge, and a red **Neachitat** indicator.

5. Click the card to open the detail view.
6. Change **Status plată** to `Avans achitat`. Click **"Salvează"**.

**Expected**: The card immediately shows an amber **Avans achitat** indicator without
a page reload.

7. Refresh the page (`F5`).

**Expected**: The card is still in "De făcut" with all data intact.

---

### User Story 2 — Move Orders Through the Workflow (P2)

*Prerequisite: at least one order on the board (from US1).*

1. Drag the card from **"De făcut"** and drop it onto **"În design"**.

**Expected**: Card appears in "În design"; "De făcut" is empty (no duplicate).

2. Refresh the page.

**Expected**: Card is still in "În design".

3. Drag the card back to **"De făcut"** (backward move).

**Expected**: Card returns to "De făcut". Backward movement is allowed.

4. Move the card through all remaining stages in sequence:
   De făcut → În design → Validare client → Printare → Asamblare → Livrat

**Expected**: Card progresses through all 6 stages correctly.

---

### User Story 3 — Filter Orders by Status or Date (P3)

*Prerequisite: create at least 3 orders with different payment statuses and event dates.*

**Payment status filter**:

1. In the filter bar, select **"Neachitat"**.

**Expected**: Only "Neachitat" cards are visible across all columns. Columns with no
matching cards remain visible (empty, not hidden).

2. Select **"Avans achitat"**.

**Expected**: Only "Avans achitat" cards visible.

3. Click **"Toate"** (or clear the filter).

**Expected**: All cards reappear across all columns.

**Date range filter**:

4. Click the **"Următoarele 30 de zile"** shortcut.

**Expected**: Only orders whose event date falls within the next 30 days are shown.

5. Click **"Șterge filtre"**.

**Expected**: All cards reappear.

---

### Sort Order Verification

1. Create two orders in the same column with different event dates
   (one event date sooner than the other).

**Expected**: The order with the sooner event date appears **above** the other in the column.

---

### Unsaved Changes Warning

1. Open a card's detail view and change any field (do not click "Salvează").
2. Click the close/cancel button (or click outside the modal).

**Expected**: A confirmation prompt appears: "Ai modificări nesalvate. Sigur vrei să închizi?"
(or equivalent). Choosing "Renunță" discards changes and closes; choosing "Continuă editarea"
returns to the form with changes intact.

---

### Delete Order

1. Open a card's detail view.
2. Click **"Șterge"** (Delete).

**Expected**: A confirmation dialog appears. Confirming permanently removes the card from the
board. Cancelling returns to the detail view with no changes.

---

## Running Tests

```bash
# Unit + integration tests (Jest)
npm test

# Coverage report
npm test -- --coverage

# E2E tests (requires dev server already running on localhost:3000)
npm run test:e2e
```

---

## API Smoke Test (optional — browser DevTools console or curl)

```bash
# List all orders
curl http://localhost:3000/api/orders

# Create an order
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"primaryName":"Test","eventDate":"2026-09-01","eventType":"botez","productTypes":["Invitații"],"paymentStatus":"neachitat"}'

# Move order to next stage (replace <id> with actual UUID from create response)
curl -X PUT http://localhost:3000/api/orders/<id> \
  -H "Content-Type: application/json" \
  -d '{"stage":"in_design"}'

# Delete order
curl -X DELETE http://localhost:3000/api/orders/<id>
```
