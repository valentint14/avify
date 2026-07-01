# Implementation Plan: Client Design Approval Portal

**Branch**: `015-client-design-approval` | **Date**: 2026-07-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/015-client-design-approval/spec.md`

## Summary

Add a public, authentication-free dynamic page at `/aprobare/[uuid]` that displays all products from an order alongside their attached graphic files. Clients open the link, review each product's design, and click "Aprobă design" per product — turning that card green instantly. Approval state is persisted in two new SQLite tables (`approval_tokens`, `product_approvals`) and survives page reloads. The feature ships with a lib helper (`src/lib/approvalTokens.js`) for token/approval CRUD, two public API routes, a Server Component page, and a `'use client'` interactive view component. Token generation UI is out of scope; a `createApprovalToken()` function enables testing and seeding.

## Technical Context

**Language/Version**: JavaScript (ES2022) / Node.js 26 / Next.js 14 (App Router)

**Primary Dependencies**: React 18, Tailwind CSS v4, Lucide React (icons already installed), `node:sqlite` DatabaseSync

**Storage**: SQLite via `node:sqlite` DatabaseSync — `getDb()` singleton; two new tables (`approval_tokens`, `product_approvals`); no changes to existing tables

**Testing**: Jest (`next/jest`) for integration tests of `approvalTokens.js`; Playwright (`@playwright/test`, `workers: 1`, shared SQLite DB) for E2E tests

**Target Platform**: Web (Next.js local dev server), Windows desktop

**Project Type**: Next.js 14 App Router web application (local desktop deployment)

**Performance Goals**:
- Approval page load: < 3 s including file display (SC-001 — up to 10 products, 1 file/product)
- Approval POST action: < 1 s from click to green highlight (SC-003)

**Constraints**:
- `node:sqlite` DatabaseSync is synchronous — MUST NOT change to async
- `getDb()` singleton must be used for all DB access
- `export const dynamic = 'force-dynamic'` required on API routes
- No new npm packages — Lucide icons and Tailwind already available
- Token generation UI is explicitly out of scope (see spec assumptions)
- Each product has exactly one `graphic_file_path` (current schema constraint from feature 012)

**Scale/Scope**: Typical order: 5–15 products; approval page is rendered server-side (RSC) so no client-side bundle overhead for initial data fetch

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| Code Quality | PASS | Single-purpose `approvalTokens.js` lib; thin route handlers; `ApprovalClientView` handles only interactive state; `page.js` is a clean Server Component |
| Testing Standards | PASS | Jest integration covers DB queries and idempotency; Playwright E2E covers US1 (approve + persist), US3 (invalid token), FR-007 (no-file disabled), FR-012 (idempotent) |
| UX Consistency | PASS | Green highlight uses Tailwind `bg-green-50 border-green-500` tokens; disabled button uses `opacity-50` + `cursor-not-allowed`; no one-off components |
| Performance | PASS | Server Component renders initial data via synchronous SQLite (< 10ms); approval POST is a single `INSERT OR IGNORE`; no N+1 patterns |
| Accessibility | PASS | Disabled buttons carry `disabled` attribute; error page uses `role="alert"`; images include `alt` text |
| No Placeholders | PASS | All tasks reference exact file paths, function signatures, and SQL |

## Project Structure

### Documentation (this feature)

```text
specs/015-client-design-approval/
├── plan.md              ← this file
├── research.md          ← Phase 0: file architecture, auth, token scope, persistence
├── data-model.md        ← approval_tokens + product_approvals schema + key queries
├── quickstart.md        ← validation scenarios
├── contracts/
│   └── api-contracts.md ← GET + POST endpoints, UI component contract
└── tasks.md             ← /speckit-tasks output (not yet created)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── aprobare/
│   │   └── [uuid]/
│   │       └── page.js                              ← NEW: Server Component — fetch data, render ApprovalClientView or error
│   └── api/
│       └── aprobare/
│           ├── [uuid]/
│           │   └── route.js                         ← NEW: GET /api/aprobare/[uuid]
│           └── [uuid]/
│               └── [productId]/
│                   └── route.js                     ← NEW: POST /api/aprobare/[uuid]/[productId]
├── components/
│   └── ApprovalClientView.js                        ← NEW: 'use client' — product cards, approval interactions
└── lib/
    ├── approvalTokens.js                            ← NEW: getApprovalPageData(), approveProduct(), createApprovalToken()
    └── db.js                                        ← EXTEND: add approval_tokens + product_approvals to SCHEMA

tests/
├── integration/
│   └── approval/
│       └── approvalTokens.test.js                   ← NEW: Jest integration — CRUD, idempotency, not-found
└── e2e/
    └── approval.spec.js                             ← NEW: Playwright E2E — US1, US3, FR-007, FR-012
```

**Structure Decision**: Next.js App Router, single project. The API uses nested dynamic segments: `[uuid]` resolves the token and `[productId]` scopes the approval action. `approvalTokens.js` keeps all DB logic isolated and testable. `ApprovalClientView` is a Client Component so the interactive approval state is self-contained; `page.js` is a Server Component that handles only data fetching and the not-found error branch.

## Implementation Notes

### `src/lib/approvalTokens.js`

```js
'use strict';
const { getDb } = require('./db.js');

function createApprovalToken(orderId) {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO approval_tokens (id, order_id, created_at) VALUES (?, ?, ?)').run(id, orderId, now);
  return { id, orderId, createdAt: now };
}

function getApprovalPageData(tokenId) {
  const db = getDb();
  const tokenRow = db.prepare(`
    SELECT at.id AS token_id, o.id AS order_id, o.name AS order_name, o.client
    FROM approval_tokens at
    JOIN orders o ON o.id = at.order_id
    WHERE at.id = ?
  `).get(tokenId);
  if (!tokenRow) return null;

  const products = db.prepare(`
    SELECT p.id, p.name, p.quantity, p.graphic_file_path,
           CASE WHEN pa.id IS NOT NULL THEN 1 ELSE 0 END AS approved
    FROM products p
    LEFT JOIN product_approvals pa ON pa.product_id = p.id AND pa.token_id = ?
    WHERE p.order_id = ?
    ORDER BY p.created_at ASC
  `).all(tokenId, tokenRow.order_id);

  return {
    order: { id: tokenRow.order_id, name: tokenRow.order_name, client: tokenRow.client ?? null },
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      quantity: Number(p.quantity ?? 1),
      hasFile: p.graphic_file_path != null,
      approved: Boolean(p.approved),
    })),
  };
}

function approveProduct(tokenId, productId) {
  const db = getDb();
  const token = db.prepare(
    'SELECT id, order_id FROM approval_tokens WHERE id = ?'
  ).get(tokenId);
  if (!token) return null;

  const product = db.prepare(
    'SELECT id, graphic_file_path FROM products WHERE id = ? AND order_id = ?'
  ).get(productId, token.order_id);
  if (!product) return null;
  if (!product.graphic_file_path) return { noFile: true };

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    'INSERT OR IGNORE INTO product_approvals (id, token_id, product_id, approved_at) VALUES (?, ?, ?, ?)'
  ).run(id, tokenId, productId, now);
  return { approved: true, productId };
}

module.exports = { createApprovalToken, getApprovalPageData, approveProduct };
```

### `GET /api/aprobare/[uuid]` (`src/app/api/aprobare/[uuid]/route.js`)

```js
import { getApprovalPageData } from '../../../../lib/approvalTokens.js';

export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
  try {
    const data = getApprovalPageData(params.uuid);
    if (!data) {
      return Response.json(
        { error: 'Acest link de aprobare nu este valid sau a expirat. Contactați studioul pentru un nou link.' },
        { status: 404 }
      );
    }
    return Response.json(data);
  } catch {
    return Response.json({ error: 'Eroare internă de server.' }, { status: 500 });
  }
}
```

### `POST /api/aprobare/[uuid]/[productId]` (`src/app/api/aprobare/[uuid]/[productId]/route.js`)

```js
import { approveProduct } from '../../../../../lib/approvalTokens.js';

export const dynamic = 'force-dynamic';

export async function POST(_req, { params }) {
  try {
    const result = approveProduct(params.uuid, params.productId);
    if (!result) return Response.json({ error: 'Link de aprobare sau produs negăsit.' }, { status: 404 });
    if (result.noFile) return Response.json({ error: 'Produsul nu are un fișier grafic atașat.' }, { status: 400 });
    return Response.json(result);
  } catch {
    return Response.json({ error: 'Eroare internă de server.' }, { status: 500 });
  }
}
```

### `src/app/aprobare/[uuid]/page.js` (Server Component)

```jsx
import { getApprovalPageData } from '../../../lib/approvalTokens.js';
import ApprovalClientView from '../../../components/ApprovalClientView.js';

export default function AprobarePage({ params }) {
  const data = getApprovalPageData(params.uuid);

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div role="alert" data-testid="approval-not-found" className="max-w-md text-center space-y-2">
          <p className="text-lg font-medium text-gray-800">
            Acest link de aprobare nu este valid sau a expirat.
          </p>
          <p className="text-sm text-gray-500">Contactați studioul pentru un nou link.</p>
        </div>
      </main>
    );
  }

  return <ApprovalClientView order={data.order} products={data.products} tokenId={params.uuid} />;
}
```

### `ApprovalClientView.js` key behaviours

- `'use client'` directive
- Props: `{ order, products, tokenId }`
- `approvedIds` state: `useState(() => new Set(products.filter(p => p.approved).map(p => p.id)))`
- For each product renders a card (`data-testid="product-card-${p.id}"`) with:
  - Product name and quantity
  - `<img src={/api/products/${p.id}/attachment} alt={p.name}>` when `hasFile === true`
  - "Aprobă design" button (`data-testid="approve-btn-${p.id}"`)
  - Disabled button + "Niciun fișier atașat" caption when `hasFile === false`
- On "Aprobă design" click: `POST /api/aprobare/${tokenId}/${p.id}`, on success `setApprovedIds(prev => new Set([...prev, p.id]))`
- Approved card gets `className` including `bg-green-50 border-green-500`; button text changes to "Design aprobat ✓" and `disabled={true}`
- On POST failure: inline error "Eroare la aprobare. Încercați din nou."
- Page header shows `order.name` and `order.client` (if set)

### `src/lib/db.js` extension

Append to the `SCHEMA` constant (before the closing backtick):

```sql
CREATE TABLE IF NOT EXISTS approval_tokens (
  id         TEXT NOT NULL PRIMARY KEY,
  order_id   TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_approval_tokens_order ON approval_tokens (order_id);

CREATE TABLE IF NOT EXISTS product_approvals (
  id          TEXT NOT NULL PRIMARY KEY,
  token_id    TEXT NOT NULL REFERENCES approval_tokens(id) ON DELETE CASCADE,
  product_id  TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  approved_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_approvals_unique ON product_approvals (token_id, product_id);
CREATE INDEX IF NOT EXISTS idx_product_approvals_token ON product_approvals (token_id);
```
