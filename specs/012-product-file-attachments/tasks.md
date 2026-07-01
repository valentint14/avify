# Tasks: Product File Attachments

**Input**: Design documents from `specs/012-product-file-attachments/`

**Prerequisites**: [plan.md](plan.md) · [spec.md](spec.md) · [research.md](research.md) · [data-model.md](data-model.md) · [contracts/api-contracts.md](contracts/api-contracts.md)

**Tests**: Included per constitution mandate — every user story MUST have at least one passing acceptance scenario before considered done.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared state with concurrent tasks)
- **[Story]**: Which user story this task belongs to (US1–US4)
- File paths are repository-relative

---

## Phase 1: Setup (Shared Constants)

**Purpose**: Add the file-type and size constants that every subsequent task depends on.

- [x] T001 Add `ATTACHMENT_EXTENSIONS` and `ATTACHMENT_MAX_BYTES` constants to `src/lib/constants.js`

**Checkpoint**: Constants exported and available to all modules.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database migration and data-layer extensions that ALL user stories depend on. No user story work can start until this phase is complete.

**⚠️ CRITICAL**: Blocks all user story phases.

- [x] T002 Add `graphic_file_path TEXT` migration to `openDb()` in `src/lib/db.js` using the existing column-existence check pattern
- [x] T003 [P] Extend `parseRow()` in `src/lib/products.js` to include `graphicFilePath: row.graphic_file_path ?? null`
- [x] T004 [P] Extend `updateProduct()` in `src/lib/products.js` to accept and persist `fields.graphicFilePath` (maps to `graphic_file_path` column)

**Checkpoint**: `getProductsByOrder()` and `PATCH /api/products/{id}` responses now include `graphicFilePath`; existing products return `null`.

---

## Phase 3: User Story 1 — Attach Graphic File to Product (Priority: P1) 🎯 MVP

**Goal**: A user can open a product's detail modal, pick a local PDF or image file, and have the file stored on the server with its path saved to the product record.

**Independent Test**: Via API — `POST /api/products/{id}/attachment` with a valid `.pdf` file → response `product.graphicFilePath` is non-null; `GET /api/products?orderId=X` returns the product with `graphicFilePath` set. No UI required.

### E2E Tests for User Story 1

> Write tests first; they must fail before T006 is implemented.

- [x] T005 [P] [US1] Add `clearOrders` + `setupOrderWithProduct` + `attachFile` helpers and write US1 acceptance scenarios in `tests/e2e/product-attachments.spec.js`:
  - Attach valid PNG → `product.graphicFilePath` set in API response
  - Attach valid PDF → `product.graphicFilePath` set in API response
  - Attach unsupported `.xlsx` → API returns 400 with accepted-types message
  - Attach file > 20 MB → API returns 413
  - Second upload replaces first (only one file in `data/attachments/{id}/`)

### Implementation for User Story 1

- [x] T006 [US1] Create `src/app/api/products/[id]/attachment/route.js` with `POST` handler: parse `multipart/form-data`, validate extension against `ATTACHMENT_EXTENSIONS`, validate size, clear any existing file in `data/attachments/{id}/`, write new file, call `updateProduct(id, { graphicFilePath: relPath })`, return updated product
- [x] T007 [US1] Extend `ProductDetailsModal.js` with the attachment section: hidden `<input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" ref>`, "Atașează fișier grafică" button when no file attached; on file-change, validate extension client-side then `POST FormData` to `/api/products/{id}/attachment`; call `onProductUpdated(updated)` on success; show inline error on 400/413

**Checkpoint**: User Story 1 fully functional — attach a file via the modal, verify `graphicFilePath` is persisted, confirmed by API and by page reload.

---

## Phase 4: User Story 2 — View Graphic on Mini-Board Card (Priority: P1)

**Goal**: Product cards in the mini-board display a thumbnail (images) or a PDF icon (PDFs) when a graphic file is attached; no indicator appears when no file is attached.

**Independent Test**: Attach a file via API (using `attachFile` helper), reload the page, expand the order — card shows the correct indicator for the file type; a product without an attachment shows no indicator.

### E2E Tests for User Story 2

> Write tests first; they must fail before T009 is implemented.

- [x] T008 [P] [US2] Append US2 acceptance scenarios to `tests/e2e/product-attachments.spec.js`:
  - Product with image attachment → card contains `[data-testid="product-file-indicator"]` with an `<img>` child
  - Product with PDF attachment → card contains `[data-testid="product-file-indicator"]` with a PDF icon
  - Product without attachment → card does NOT contain `[data-testid="product-file-indicator"]`

### Implementation for User Story 2

- [x] T009 [US2] Add `GET` handler to `src/app/api/products/[id]/attachment/route.js`: look up `graphicFilePath` from DB, resolve absolute path, `fs.existsSync` check (404 if missing), map extension to `Content-Type`, stream file bytes with `Cache-Control: no-store`
- [x] T010 [US2] Extend `ProductCard.js` with file indicator: if `product.graphicFilePath` is null render nothing; derive `ext` from path; PDF → `<button data-testid="product-file-indicator" aria-label="Deschide grafică PDF"><FileText className="h-5 w-5 text-muted-foreground" /></button>`; image → `<button data-testid="product-file-indicator" aria-label="Deschide grafică"><img src={/api/products/${product.id}/attachment} className="h-8 w-8 rounded object-cover" alt="" /></button>`

**Checkpoint**: User Stories 1 and 2 are both functional — attach a file and immediately see the correct indicator on the product card.

---

## Phase 5: User Story 3 — Open Graphic File from Product Card (Priority: P1)

**Goal**: Clicking the file indicator on a product card opens the attached file in the OS default application; if the file has been deleted from disk, a readable inline error appears on the card.

**Independent Test**: Attach a file via API, expand the order, click the indicator on the product card — the OS opens the file; then delete the file from disk manually and click again — the inline error "Fișierul nu a fost găsit la calea stocată. Re-atașați fișierul." appears below the card.

### E2E Tests for User Story 3

> Write tests first; they must fail before T012 is implemented.

- [x] T011 [P] [US3] Append US3 acceptance scenarios to `tests/e2e/product-attachments.spec.js`:
  - Click indicator with valid file → `POST /attachment/open` returns `{ opened: true }` (mock OS spawn in test by checking API response, not the OS app)
  - Click indicator when file missing from disk → inline error text contains "Fișierul nu a fost găsit"

### Implementation for User Story 3

- [x] T012 [US3] Create `src/app/api/products/[id]/attachment/open/route.js` with `POST` handler: look up `graphicFilePath`, resolve absolute path, `fs.existsSync` → 404 with re-attach message if missing, `spawn('cmd', ['/c', 'start', '', absPath], { detached: true, stdio: 'ignore', shell: false })`, return `{ opened: true }`
- [x] T013 [US3] Add `handleOpenFile` click handler to the file indicator buttons in `ProductCard.js`: `POST /api/products/{id}/attachment/open` → on success: no-op (OS launches externally); on 404: `setFileError(data.error)` and render `<p className="text-xs text-destructive mt-0.5">{fileError}</p>` below the card; clear error on next successful attach

**Checkpoint**: All three P1 user stories are functional — attach, view indicator, click to open in OS.

---

## Phase 6: User Story 4 — Remove or Replace Graphic File (Priority: P2)

**Goal**: A user can remove an existing attachment (clears the path and deletes the file from disk) or replace it with a different file, with the product card updating immediately.

**Independent Test**: Attach a file via API, open the product modal, click "Elimină", close the modal — card no longer shows the file indicator. Open modal again, click "Înlocuiește", pick a different file — card shows the new indicator.

### E2E Tests for User Story 4

> Write tests first; they must fail before T015 is implemented.

- [x] T014 [P] [US4] Append US4 acceptance scenarios to `tests/e2e/product-attachments.spec.js`:
  - Remove: attach via API, open modal, click "Elimină" → card loses indicator; `product.graphicFilePath` null in API
  - Replace: attach via API, open modal, click "Înlocuiește", pick new file → card shows new file type's indicator
  - Page reload after removal → indicator still absent

### Implementation for User Story 4

- [x] T015 [US4] Add `DELETE` handler to `src/app/api/products/[id]/attachment/route.js`: look up `graphicFilePath` (404 if null), `fs.rmSync(absPath, { force: true })`, `updateProduct(id, { graphicFilePath: null })`, return updated product
- [x] T016 [US4] Extend the attachment section in `ProductDetailsModal.js` to show filename + **"Elimină"** + **"Înlocuiește"** when a file is attached: "Elimină" calls `DELETE /attachment` and propagates `onProductUpdated`; "Înlocuiește" re-triggers the hidden file input (reuses T007's upload logic)

**Checkpoint**: All four user stories are functional and independently testable.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Persistence validation, accessibility audit, and quickstart sign-off.

- [x] T017 Add persistence E2E scenario to `tests/e2e/product-attachments.spec.js`: attach a file, hard-reload (`page.reload()`), expand order, verify indicator is still visible
- [x] T018 [P] Audit `aria-label` and keyboard accessibility on all new interactive elements in `ProductCard.js` and `ProductDetailsModal.js`; fix any missing labels
- [x] T019 Run all 10 scenarios from `specs/012-product-file-attachments/quickstart.md` manually and confirm each passes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user story phases
- **US1 (Phase 3)**: Depends on Phase 2
- **US2 (Phase 4)**: Depends on Phase 3 (product must have `graphicFilePath` to serve thumbnail)
- **US3 (Phase 5)**: Depends on Phase 4 (indicator must exist to be clickable)
- **US4 (Phase 6)**: Depends on Phase 3 (attachment must exist to remove/replace)
- **Polish (Phase 7)**: Depends on all user story phases

### User Story Dependencies

- **US1** is the MVP gate — all other stories consume the data it writes
- **US2** needs US1 data (a product with `graphicFilePath` set) to validate card rendering
- **US3** adds behaviour to the indicator rendered in US2 — depends on US2
- **US4** adds remove/replace to the modal section added in US1 — depends on US1; US2 required to verify card updates

### Within Each User Story

- Tests written and confirmed failing before implementation begins (constitution requirement)
- E2E test tasks [P] start in parallel with any tasks not touching the same file
- API route handler before UI component that calls it

### Parallel Opportunities

- T003 and T004 (both in `products.js`) are independent edits and can run in parallel
- T005, T008, T011, T014 (E2E test stubs) can be written in parallel while API routes are being built
- T009 (GET route) and T010 (ProductCard rendering) can be written in parallel — they touch different files

---

## Parallel Example: User Story 1

```
Parallel track A: T005 — write E2E test stubs (product-attachments.spec.js)
Parallel track B: T006 — POST attachment route (route.js)
Parallel track C: T007 — ProductDetailsModal attachment section (ProductDetailsModal.js)
Merge: run T005 tests against T006+T007 implementation — all should pass
```

## Parallel Example: User Story 2

```
Parallel track A: T008 — write E2E test stubs
Parallel track B: T009 — GET file-serving route (route.js)
Parallel track C: T010 — ProductCard indicator rendering (ProductCard.js)
Merge: run T008 tests — all should pass
```

---

## Implementation Strategy

### MVP (User Story 1 only)

1. Phase 1 + Phase 2 (constants + DB migration + products.js extension)
2. Phase 3 (POST attachment API + modal section)
3. **Stop and validate**: confirm file path persists via API and page reload
4. Ship as v1 if needed — other stories build on top

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → attach works via modal ✓
3. US2 → card shows indicator ✓
4. US3 → clicking indicator opens file in OS ✓
5. US4 → remove/replace works ✓
6. Polish → accessibility + quickstart sign-off ✓

---

## Notes

- [P] tasks operate on different files and have no ordering dependency on each other within the same phase
- [Story] label maps each task to the user story for traceability against `spec.md`
- E2E tests use `workers: 1` (shared SQLite DB) — do not change `playwright.config.js`
- `data/attachments/` directory is created on first upload via `fs.mkdirSync({ recursive: true })` — no manual setup needed
- All Romanian UI strings are listed in `plan.md` → Romanian Labels table
- Do not add `data/attachments/` to `.gitignore` decisions — leave for the implementer to decide per project policy
