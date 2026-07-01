# Quickstart Validation Guide: Client Design Approval Portal (015)

## Prerequisites

- Dev server running: `npm run dev`
- A seeded database with at least one order and at least one product with a `graphic_file_path` attached.
- An approval token created for that order. Since the token generation UI is out of scope for this feature, create one using the Node.js REPL or a seed script:

```js
// In a Node.js REPL or quick script (not production code):
const { createApprovalToken } = require('./src/lib/approvalTokens.js');
const token = createApprovalToken('<order-id>');
console.log(`Approval URL: http://localhost:3000/aprobare/${token.id}`);
```

---

## Scenario 1 — Happy path: Client views and approves a product (US1 / P1)

**Setup**: Order with 2 products, both with attached graphic files; a valid approval token for this order.

**Steps**:
1. Open `http://localhost:3000/aprobare/<tokenId>` in a browser (no login session).
2. Verify the page loads and shows the order name/client at the top.
3. Verify 2 product cards are shown, each displaying the attached graphic file (image or PDF embed).
4. Verify each card has an enabled "Aprobă design" button.
5. Click "Aprobă design" on the first product.
6. Verify the first product card turns green and the button reads "Design aprobat ✓" and is disabled.
7. Verify the second product card is unchanged.
8. Reload the page.
9. Verify the first product is still green (persisted approval), the second is still pending.

**Expected API calls**:
- `GET /api/aprobare/<tokenId>` → 200, product 1 `approved: false`, product 2 `approved: false`
- (after click) `POST /api/aprobare/<tokenId>/<productId1>` → 200 `{ approved: true }`
- (after reload) `GET /api/aprobare/<tokenId>` → 200, product 1 `approved: true`, product 2 `approved: false`

---

## Scenario 2 — Product without attached file (FR-007)

**Setup**: Order with 1 product that has NO graphic file attached; valid approval token.

**Steps**:
1. Open the approval page.
2. Verify the product card is shown with a disabled "Aprobă design" button.
3. Verify a visible explanation is shown (e.g., "Niciun fișier atașat").
4. Confirm no approval POST is possible (button is disabled, no click event fires).

---

## Scenario 3 — Invalid token (US3 / P3)

**Steps**:
1. Open `http://localhost:3000/aprobare/invalid-token-that-does-not-exist`.
2. Verify the page renders a user-friendly error message in Romanian.
3. Verify `data-testid="approval-not-found"` is present in the DOM.
4. Verify no stack trace, HTTP error text, or internal system details are visible.
5. Verify the page title is not blank.

---

## Scenario 4 — Idempotent approval (FR-012)

**Setup**: Valid token, one product with a file.

**Steps**:
1. Open the approval page and approve the product.
2. In the browser DevTools, manually fire a second `POST /api/aprobare/<tokenId>/<productId>`.
3. Verify the response is still `200 { approved: true }` — no error, no duplicate record.
4. Verify the `product_approvals` table still has exactly one row for `(tokenId, productId)`.

---

## Scenario 5 — Studio sees approval status internally (US2 / P2)

**Setup**: Token exists for an order; client has approved product A but not product B.

**Steps**:
1. Navigate to the internal order view (Kanban board or order detail).
2. Verify product A shows an "Aprobat" badge or green indicator.
3. Verify product B shows no approval indicator.

**Note**: The exact internal UI component that surfaces this badge will be determined during implementation. The `GET /api/products?orderId=<id>` (or equivalent products list query) will include `approved: boolean` per product after this feature.

---

## Scenario 6 — Mobile layout (FR-013)

**Steps**:
1. Open the approval page in Chrome DevTools at 375px viewport width.
2. Verify all product cards are readable without horizontal scrolling.
3. Verify the "Aprobă design" button is tappable (minimum 44×44px touch target).
4. Verify graphic files display within the card bounds.

---

## Running Automated Tests

```bash
# Unit/integration tests (Jest)
npm test -- --testPathPattern=approval

# E2E tests (Playwright)
npx playwright test tests/e2e/approval.spec.js
```

See [data-model.md](../data-model.md) for DB schema details.
See [contracts/api-contracts.md](../contracts/api-contracts.md) for API shapes and `data-testid` selectors.
