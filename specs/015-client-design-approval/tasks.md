# Tasks: Client Design Approval Portal (015)

**Input**: Design documents from `specs/015-client-design-approval/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [data-model.md](data-model.md), [contracts/api-contracts.md](contracts/api-contracts.md), [research.md](research.md), [quickstart.md](quickstart.md)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create directory scaffolding for all new routes and source files.

- [x] T001 Create directory structure: `src/app/aprobare/[uuid]/`, `src/app/api/aprobare/[uuid]/`, `src/app/api/aprobare/[uuid]/[productId]/`, `tests/integration/approval/`

**Checkpoint**: Directory structure ready — all subsequent tasks can create files in place.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: DB schema migration and lib functions that ALL user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 Extend `src/lib/db.js` — append `approval_tokens` and `product_approvals` table definitions (with indexes and UNIQUE constraint) to the `SCHEMA` constant, following the existing `CREATE TABLE IF NOT EXISTS` pattern. See [data-model.md](data-model.md) for exact SQL.
- [x] T003 Create `src/lib/approvalTokens.js` — implement three exported functions: `createApprovalToken(orderId)`, `getApprovalPageData(tokenId)`, `approveProduct(tokenId, productId)`. Use `getDb()` singleton and named parameters. See [plan.md](plan.md) Implementation Notes for full function bodies.

**Checkpoint**: Foundation ready — both DB tables exist on first app start; lib functions are importable and testable.

---

## Phase 3: User Story 1 — Client Views and Approves Product Designs (Priority: P1) 🎯 MVP

**Goal**: A client opens `/aprobare/[uuid]`, sees all order products with their graphic files, clicks "Aprobă design" per product, and the card turns green — persisted across page reloads.

**Independent Test**: Seed one order with two products (one with a file, one without), call `createApprovalToken(orderId)`, open the approval URL without logging in, approve the product with a file, reload, confirm green state persists and the no-file product's button is disabled.

### Implementation for User Story 1

- [x] T004 [P] Write Jest integration tests for `src/lib/approvalTokens.js` in `tests/integration/approval/approvalTokens.test.js`. Cover: `createApprovalToken()` creates a DB row; `getApprovalPageData()` returns null for unknown token; `getApprovalPageData()` returns products with correct `hasFile` and `approved` flags; `approveProduct()` returns `{ approved: true }`; `approveProduct()` is idempotent (second call on same token+product returns same result, no duplicate DB row); `approveProduct()` returns `{ noFile: true }` for a product with no file; `approveProduct()` returns null when token or product not found. Use `openDb()` with an in-memory path for test isolation.
- [x] T005 [P] Create `src/app/api/aprobare/[uuid]/route.js` — export `dynamic = 'force-dynamic'` and `GET(_req, { params })`. Call `getApprovalPageData(params.uuid)`; return 200 JSON on success or 404 with Romanian error message on null. See [contracts/api-contracts.md](contracts/api-contracts.md) for exact response shapes.
- [x] T006 [P] Create `src/app/api/aprobare/[uuid]/[productId]/route.js` — export `dynamic = 'force-dynamic'` and `POST(_req, { params })`. Call `approveProduct(params.uuid, params.productId)`; return 200 on success, 400 when `noFile`, 404 when null. See [contracts/api-contracts.md](contracts/api-contracts.md) for exact response shapes.
- [x] T007 Create `src/components/ApprovalClientView.js` — `'use client'` component accepting `{ order, products, tokenId }` props. Manage `approvedIds` state initialized from `products.filter(p => p.approved)`. Render: page header with order name and client; one card per product (`data-testid="product-card-${p.id}"`) showing product name, quantity, and `<img src="/api/products/${p.id}/attachment" alt={p.name}>` when `hasFile`. For approved cards apply `bg-green-50 border-green-500` classes and show "Design aprobat ✓" button (disabled). For pending cards with file, show enabled "Aprobă design" button (`data-testid="approve-btn-${p.id}"`); on click POST to `/api/aprobare/${tokenId}/${p.id}` and update `approvedIds` on 200. For cards without file, show disabled button + "Niciun fișier atașat" caption. On POST failure show inline error "Eroare la aprobare. Încercați din nou." See [contracts/api-contracts.md](contracts/api-contracts.md) for full UI component contract.
- [x] T008 Create `src/app/aprobare/[uuid]/page.js` — Server Component (no `'use client'`). Call `getApprovalPageData(params.uuid)` directly (no fetch). When `data` is null, render a full-page centered error `<div role="alert" data-testid="approval-not-found">` with Romanian message "Acest link de aprobare nu este valid sau a expirat. Contactați studioul pentru un nou link." When data exists, render `<ApprovalClientView order={data.order} products={data.products} tokenId={params.uuid} />`.
- [x] T009 Write Playwright E2E tests for US1 in `tests/e2e/approval.spec.js`. Follow existing E2E conventions (`workers: 1`, shared SQLite DB). Cover: (1) happy path — seed order + 2 products (one with file, one without) + token, open `/aprobare/[uuid]`, verify page loads with order name, approve product-with-file, verify green state, verify no-file button disabled; (2) approval persists — reload page after approval and confirm green state remains; (3) idempotent POST — call approve API twice and confirm no error and single DB row.

**Checkpoint**: US1 fully functional. Open `/aprobare/[uuid]` in browser, approve a product, reload — green state persists. No-file product button is disabled.

---

## Phase 4: User Story 2 — Studio Monitors Approval Status (Priority: P2)

**Goal**: A studio employee viewing an order internally can see which products have been client-approved (green "Aprobat" badge).

**Independent Test**: After a client approves product A via the public link, open the order in the internal app and confirm product A shows an "Aprobat" badge while product B (unapproved) does not.

### Implementation for User Story 2

- [x] T010 Add `getApprovalStatusForOrder(orderId)` to `src/lib/approvalTokens.js` — query `product_approvals` JOIN `approval_tokens` WHERE `order_id = ?` and return a `Set<string>` (or array) of approved product IDs. All tokens for the order are included (union of approvals across sessions). See [data-model.md](data-model.md) for the SQL query.
- [x] T011 Create `src/app/api/orders/[id]/approval-status/route.js` — export `dynamic = 'force-dynamic'` and `GET(_req, { params })`. Call `getApprovalStatusForOrder(params.id)`; return `{ approvedProductIds: [...] }` as 200 JSON, or 404 if the order does not exist.
- [x] T012 [US2] Identify the internal React component(s) in `src/components/` that render a product list within the context of a specific order (search for uses of `order_id` or product card renders in board/detail components). Extend that component to fetch `GET /api/orders/[id]/approval-status` on mount and annotate each product card with a green "Aprobat" chip/badge where `approvedProductIds.includes(product.id)`.

**Checkpoint**: US2 complete. After a client approves via public link, the studio's internal order view shows the "Aprobat" badge on that product without requiring a page hard-reload.

---

## Phase 5: User Story 3 — Invalid or Unknown Approval Link (Priority: P3)

**Goal**: Opening a malformed or unknown approval URL shows a user-friendly Romanian error — no crash, no stack trace.

**Independent Test**: Open `/aprobare/not-a-real-uuid` and confirm a friendly error page renders with `data-testid="approval-not-found"` and no technical error text.

### Implementation for User Story 3

*Note: The core implementation for US3 (the error branch in `page.js`) is already delivered in Phase 3 (T008). This phase adds dedicated E2E test coverage and verifies the error state meets all acceptance criteria.*

- [x] T013 [US3] Add US3 E2E scenarios to `tests/e2e/approval.spec.js` — (1) open `/aprobare/invalid-token-that-does-not-exist` and assert `data-testid="approval-not-found"` is visible and page title is non-blank; (2) assert no stack trace text or HTTP error code is rendered; (3) open `/aprobare/` (no UUID segment) and confirm Next.js 404 or the same error page — document which behavior is acceptable.
- [x] T014 [US3] Manual verification pass for the error page: confirm `role="alert"` is present on the error container, the Romanian error message is grammatically correct, and there are no blank screens or unhandled promise rejections in browser DevTools for the invalid-token case.

**Checkpoint**: US3 complete. Any malformed or unknown approval URL renders a clear, user-friendly error page in Romanian with no internal details exposed.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Mobile layout, accessibility, and end-to-end validation.

- [x] T015 [P] Mobile layout validation — open the approval page in Chrome DevTools at 375px viewport; verify all product cards are readable without horizontal scroll, the "Aprobă design" button meets minimum touch target size (44×44 px), and graphic file images scale within card bounds. Fix any overflow issues in `ApprovalClientView.js`.
- [x] T016 Run all quickstart.md validation scenarios (Scenarios 1–6) against the local dev server and confirm all expected outcomes are met. Document any deviations.
- [x] T017 [P] Accessibility review — confirm: disabled buttons carry HTML `disabled` attribute (not just visual styling); error container has `role="alert"`; all `<img>` tags have non-empty `alt` text; page has a meaningful `<title>` (set via Next.js `metadata` export or `<title>` tag); keyboard navigation reaches the "Aprobă design" button.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **BLOCKS all user story phases**
- **US1 (Phase 3)**: Depends on Phase 2 — primary MVP delivery
- **US2 (Phase 4)**: Depends on Phase 2 (and benefits from US1 for E2E seeding)
- **US3 (Phase 5)**: Depends on Phase 3 (T008 must exist before US3 E2E tests)
- **Polish (Phase 6)**: Depends on Phases 3, 4, and 5

### User Story Dependencies

- **US1 (P1)**: Start after Phase 2 — no dependency on US2 or US3
- **US2 (P2)**: Start after Phase 2 — T010/T011 are independent of US1 tasks; T012 component update benefits from US1's approval data being real but can be mocked
- **US3 (P3)**: T013/T014 depend on T008 (page.js) being complete

### Within Each Phase

- T002 → T003 (approvalTokens.js imports from db.js)
- T003 → T005, T006, T007, T008 (all import from approvalTokens.js or use its output)
- T007 → T008 (page.js imports ApprovalClientView)
- T005, T006 → T009 (E2E tests hit these API routes)
- T010 → T011 → T012 (US2 chain)
- T008 → T013 (US3 E2E needs the error page to exist)

---

## Parallel Opportunities

### Within Phase 2
```
T002 (db.js)  →  T003 (approvalTokens.js)    [sequential: T003 requires T002]
```

### Within Phase 3
```
# After T003 completes, these can all start in parallel:
T004  [approvalTokens.test.js — integration tests]
T005  [GET /api/aprobare/[uuid]/route.js]
T006  [POST /api/aprobare/[uuid]/[productId]/route.js]

# After T005 + T006 + T007 complete:
T008  [page.js]

# After T008 complete:
T009  [E2E tests]
```

### Within Phase 4
```
# After T003 completes:
T010  [getApprovalStatusForOrder() function]  →  T011  [API route]  →  T012  [component]
```

### Within Phase 6
```
T015 [P]  }
T017 [P]  }  can run in parallel
T016      }  run after T015 + T017
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (T004–T009)
4. **STOP and VALIDATE**: Seed a token, open the approval URL, approve a product, reload
5. US1 delivered — clients can approve designs

### Incremental Delivery

1. Setup + Foundational (Phase 1–2) → Foundation ready
2. US1 (Phase 3) → **MVP**: clients can review and approve designs
3. US2 (Phase 4) → Studio sees approval badges internally
4. US3 (Phase 5) → Error handling fully validated
5. Polish (Phase 6) → Mobile layout + accessibility confirmed

---

## Notes

- **[P]** tasks touch different files and have no incomplete-task dependencies — safe to run in parallel
- **[Story]** label traces each task back to its user story for traceability
- `createApprovalToken()` is the seeding mechanism for tests (token generation UI is out of scope per spec assumptions)
- `INSERT OR IGNORE` in `approveProduct()` handles idempotency at the DB level — no application-layer duplicate check needed
- The `graphic_file_path` on products stores a single file (feature 012 constraint); the approval page renders one file per product
- Existing `GET /api/products/[id]/attachment` endpoint is reused as-is for file display — no new file-serving route needed
- E2E tests must use `workers: 1` to avoid SQLite write conflicts (established project convention per memory)
