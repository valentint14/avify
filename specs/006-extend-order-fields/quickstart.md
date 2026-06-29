# Quickstart Validation Guide: Extend Order Fields & Auto-Calculated Totals

**Feature**: 006-extend-order-fields
**Date**: 2026-06-29

This guide describes how to verify the feature end-to-end once it is implemented. It is not implementation code — see `tasks.md` for the implementation steps.

## Prerequisites

- Node.js 22+ installed (required for `node:sqlite`)
- Dependencies installed: `npm install`
- No running `avify.db` lock from a previous process

## Start the App

```bash
npm run dev
```

App runs at `http://localhost:3000`.

## Scenario 1 — New Order Fields Saved and Displayed

1. Open `http://localhost:3000`
2. Create an order using the "Adaugă comandă" form (name only is enough)
3. Click "Editează" on the new order
4. In the **Order Details** section of the modal, fill in:
   - Client: `Maria Ionescu`
   - Dată primire: `2026-07-01`
   - Avans: `500`
   - Județ: `Cluj`
   - Platformă contact: select `Facebook`
   - Dată eveniment: `2026-08-15`
   - Termen livrare: `2026-08-10`
   - Profit: `150`
   - Toggle **Încasată** to ON
   - Toggle **Livrată** to OFF
5. Click **Salvează**
6. **Verify**: The order row in the table shows:
   - "Încasată" badge/indicator visible and green/active
   - "Livrată" indicator shows not delivered
   - Total: `0 RON` (no products yet)
   - Profit: `150 RON`
7. Reopen "Editează" and **verify** all field values are pre-populated exactly as entered

## Scenario 2 — Unit Price & Auto-Calculated Total

1. With the same order open, add two products (e.g., "Invitații" and "Meniuri")
2. In the **Products** section of the edit modal:
   - Set "Invitații": Quantity = `3`, Preț unitar = `50`
   - Set "Meniuri": Quantity = `2`, Preț unitar = `120`
3. Click **Salvează**
4. **Verify**: The order row in the table shows **Total: 390 RON** (3×50 + 2×120)
5. **Verify**: Expand the order — the Total of `390 RON` also appears in the order details view

## Scenario 3 — Total Updates on Change

1. Open "Editează" for the same order
2. Change "Invitații" Preț unitar from `50` to `100`
3. Save
4. **Verify**: Total updates to **590 RON** (3×100 + 2×120)

## Scenario 4 — Order with No Products

1. Create a new order without adding any products
2. **Verify**: The order row displays **Total: 0 RON**

## Scenario 5 — Custom Contact Platform

1. Open "Editează" on any order
2. In Platformă contact, select `Altele`
3. A text input appears — type `WhatsApp`
4. Save
5. **Verify**: The field shows `WhatsApp` when reopening the form

## Scenario 6 — Collected/Delivered Quick Scan

1. Create two orders:
   - Order A: Încasată = ON, Livrată = ON
   - Order B: Încasată = OFF, Livrată = OFF
2. **Verify**: Both order rows show distinct visual indicators for paid/unpaid and delivered/not-delivered status without needing to expand or click anything

## API Verification (optional — curl)

```bash
# Create an order with all new fields
curl -s -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","client":"Ion","advance":200,"county":"Iași","contactPlatform":"Instagram","collected":false,"delivered":false}' \
  | jq .

# Update order metadata
curl -s -X PATCH http://localhost:3000/api/orders/<ID> \
  -H "Content-Type: application/json" \
  -d '{"collected":true,"profit":300}' \
  | jq .

# Update a product with unit price
curl -s -X PATCH http://localhost:3000/api/products/<PRODUCT_ID> \
  -H "Content-Type: application/json" \
  -d '{"unitPrice":75}' \
  | jq .

# Verify total appears in GET orders
curl -s http://localhost:3000/api/orders | jq '.orders[] | {name,total,profit,collected,delivered}'
```

## E2E Tests

```bash
npm run test:e2e -- --grep "order-fields"
```

Expected: all scenarios in `tests/e2e/order-fields.spec.js` pass.

## Unit Tests

```bash
npm test -- --testPathPattern="orders"
```

Expected: all unit tests in `tests/unit/orders.test.js` pass, coverage for `src/lib/orders.js` ≥ 80%.

## References

- Data model: [data-model.md](data-model.md)
- API contracts: [contracts/api.md](contracts/api.md)
- Spec: [spec.md](spec.md)
