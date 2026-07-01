# Research: Client Design Approval Portal (015)

## File Attachment Architecture

**Decision**: The approval page displays **one graphic file per product** (not multiple).

**Rationale**: The current `products` table has a single `graphic_file_path TEXT` column (feature 012). Files are stored at `data/attachments/<productId>/<filename>` and served by `GET /api/products/[id]/attachment`. No multi-file attachment support exists. The spec's "fișierele grafice" (plural) is interpreted as "the graphic file(s) if present" — practically one file per product.

**Alternatives considered**: Adding a separate `product_files` table to support multiple attachments per product. Rejected as out of scope for this feature; the existing single-file constraint is sufficient.

---

## Authentication / Public Route Access

**Decision**: No special opt-out or middleware change is needed to make `/aprobare/[uuid]` public.

**Rationale**: The Avify app has **no authentication middleware**. All routes are public by default (local desktop deployment, single-user). The `/aprobare/[uuid]` page requires no exemption from auth because there is no auth system. Security relies on UUID unguessability (secure-by-obscurity), which is appropriate for this use case.

**Alternatives considered**: Adding a Next.js `middleware.ts` that whitelists `/aprobare/*`. Rejected — unnecessary complexity when there is no auth middleware to begin with.

---

## File Serving for the Public Approval Page

**Decision**: The approval page image tags use `/api/products/[id]/attachment` directly.

**Rationale**: The existing `GET /api/products/[id]/attachment` route reads from disk and returns the file bytes with the correct MIME type. It is already accessible without authentication. The public page simply renders `<img src="/api/products/{productId}/attachment" />` for image files, and a download link with the same URL for PDFs.

**Alternatives considered**: Copying/re-exposing files via a new `/api/aprobare/[uuid]/file/[productId]` endpoint that validates the token before serving. This adds token-gated file access — more secure but adds complexity. Deferred to a future hardening step if the app ever adds real authentication.

---

## Token Generation Scope

**Decision**: Token generation UI is **out of scope**. The `createApprovalToken(orderId)` lib function will exist (needed for tests and seed scripts) but no UI button will be built in this feature.

**Rationale**: Per spec assumptions, sharing the approval link is a manual step outside this feature's scope. Test coverage will use `createApprovalToken()` directly to seed test tokens. A future feature can expose a "Generează link aprobare" button in the order detail view.

---

## Approval Persistence Strategy

**Decision**: Two new DB tables: `approval_tokens` and `product_approvals`.

**Rationale**:
- `approval_tokens`: links a UUID slug to a specific order. One row per approval campaign.
- `product_approvals`: one row per approved product per token. `UNIQUE(token_id, product_id)` enforces idempotency at the DB level (FR-012).
- Both tables use the existing `ALTER TABLE`-in-`openDb()` migration pattern already established in `db.js` — no separate migration files needed.
- `ON DELETE CASCADE` on both foreign keys ensures orphan cleanup when orders or tokens are deleted.

**Alternatives considered**: Storing approval state as a boolean flag on the `products` table. Rejected because approval is specific to a token (each client visit), not an intrinsic product property. Multiple clients could theoretically have separate approval sessions in the future.

---

## Internal Approval Status Visibility (US2)

**Decision**: Extend `GET /api/products?orderId=<id>` (or the products list within the order context) to include an `approved` boolean per product, derived by checking `product_approvals` against the order's approval token.

**Rationale**: US2 requires the studio to see which products are client-approved. The cleanest approach is a new helper `getApprovalStatusForOrder(orderId)` in `approvalTokens.js` that returns `{ [productId]: boolean }`. The existing `GET /api/products` route (or order detail component) can then annotate each product with its approval status. Internal UI components show a green "Aprobat" badge where `approved === true`.

**Alternatives considered**: A separate dedicated endpoint `GET /api/aprobare/order/[orderId]/status`. Added complexity without benefit — the internal order view already has the order ID, so annotating the existing products query is simpler.

---

## DB Migration Approach

**Decision**: Use the existing `openDb()` function in `src/lib/db.js` to run `CREATE TABLE IF NOT EXISTS` statements for the two new tables, consistent with the established pattern.

**Rationale**: All schema changes in this project use `db.exec(SCHEMA)` with `CREATE TABLE IF NOT EXISTS` in `openDb()`. Adding the new tables to the `SCHEMA` constant (or as an appended `db.exec` call) is the correct approach. No external migration tool is used.

---

## Performance Considerations

- `getApprovalPageData(uuid)` runs three synchronous SQLite queries: token lookup, products query (JOIN with approval status), and the order lookup. All on a local SQLite file — well under 100ms.
- The approval POST is a single `INSERT OR IGNORE` statement — sub-millisecond.
- No caching needed; the approval page fetches fresh data on each load (page load is a Server Component render).
