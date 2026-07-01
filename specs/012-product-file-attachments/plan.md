# Implementation Plan: Product File Attachments

**Branch**: `012-product-file-attachments` | **Date**: 2026-07-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/012-product-file-attachments/spec.md`

## Summary

Extend each product record with an optional `graphic_file_path` column in the SQLite `products` table. Users attach a local graphic file (PDF or image) via `ProductDetailsModal`; the file is uploaded to `data/attachments/{productId}/` on the Next.js server. `ProductCard` renders a thumbnail (images) or PDF badge (PDFs) using a new `GET /api/products/{id}/attachment` serving route. A `POST /api/products/{id}/attachment/open` route opens the file in the OS default application via `child_process.spawn`. No new npm dependencies; no new database tables; migration uses the existing `ALTER TABLE` column-check pattern.

## Technical Context

**Language/Version**: JavaScript (ES2022) / Node.js 26 / Next.js 14 (App Router)

**Primary Dependencies**: React 18, Tailwind CSS v4, shadcn/ui (Dialog already installed), Lucide React (`FileText` icon), `node:fs`, `node:path`, `node:child_process` (all Node built-ins)

**Storage**: SQLite via `node:sqlite` `DatabaseSync` — `products` table extended with `graphic_file_path TEXT NULL`; physical files stored at `data/attachments/{productId}/{filename}`

**Testing**: Playwright (`@playwright/test`) for E2E — `workers: 1`, shared SQLite DB; helpers from `tests/e2e/product-details.spec.js` reused; new `tests/e2e/product-attachments.spec.js`

**Target Platform**: Web (Next.js local dev server), Windows desktop — `cmd /c start` used for OS file open

**Project Type**: Next.js 14 App Router web application (local desktop deployment)

**Performance Goals**:
- File upload response: < 1 s for files under 20 MB (local disk write)
- Thumbnail served from local disk: < 200 ms (well under SC-002's 2 s target)
- Card re-render after attach/remove: immediate React state update, no page reload (SC-004)

**Constraints**:
- `staleTimes: { dynamic: 0 }` in `next.config.js` MUST NOT change
- `node:sqlite` DatabaseSync is synchronous — MUST NOT change to async
- `getDb()` singleton must be used for all DB access
- No new npm packages — all file I/O via Node.js built-ins
- One file per product: `data/attachments/{productId}/` holds exactly one file; upload replaces the previous

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| Code Quality | PASS | Follows naming, file layout, and hook patterns from features 004 and 006 |
| Testing Standards | PASS | Playwright E2E covers US1–US4; `parseRow` unit test extended |
| UX Consistency | PASS | Uses existing shadcn Dialog; Lucide icon; Tailwind tokens only |
| Performance | PASS | All I/O is local disk — well under 200 ms p95 threshold |
| Accessibility | PASS | File buttons carry `aria-label`; errors are readable text, not icons only |
| No Placeholders | PASS | All tasks will reference exact file paths and function signatures |

## Project Structure

### Documentation (this feature)

```text
specs/012-product-file-attachments/
├── plan.md              ← this file
├── research.md          ← Phase 0: storage, OS-open, and type-detection decisions
├── data-model.md        ← graphic_file_path column + file system layout
├── quickstart.md        ← 10 validation scenarios
├── contracts/
│   └── api-contracts.md ← 4 API endpoints + UI contracts
└── tasks.md             ← /speckit-tasks output (not yet created)
```

### Source Code (repository root)

```text
src/
├── app/
│   └── api/
│       └── products/
│           └── [id]/
│               ├── route.js                        ← existing PATCH/DELETE (no changes needed)
│               └── attachment/
│                   ├── route.js                    ← NEW: GET (serve file), POST (upload), DELETE (remove)
│                   └── open/
│                       └── route.js                ← NEW: POST (open in OS via child_process)
├── components/
│   ├── ProductCard.js                              ← extend: add file indicator + open click handler
│   └── ProductDetailsModal.js                     ← extend: add attachment section
└── lib/
    ├── db.js                                       ← extend: ADD COLUMN graphic_file_path migration
    ├── products.js                                 ← extend: parseRow + updateProduct with graphicFilePath
    └── constants.js                               ← extend: ATTACHMENT_EXTENSIONS + ATTACHMENT_MAX_BYTES

tests/
└── e2e/
    └── product-attachments.spec.js                ← NEW: Playwright E2E for all 4 user stories
```

**Structure Decision**: Next.js App Router, single project. New API routes use nested `[id]/attachment/` following the same pattern as `[id]/route.js`. No new top-level directories.

## Implementation Notes

### DB Migration (follows existing `db.js` pattern)

```js
const prodCols = db.prepare('PRAGMA table_info(products)').all();
if (!prodCols.some((c) => c.name === 'graphic_file_path')) {
  db.exec('ALTER TABLE products ADD COLUMN graphic_file_path TEXT');
}
```

### `parseRow` Extension (`src/lib/products.js`)

```js
graphicFilePath: row.graphic_file_path ?? null,
```

### `updateProduct` Extension

Add `graphicFilePath` to the existing field-dispatch block:

```js
if (fields.graphicFilePath !== undefined) {
  setClauses.push('graphic_file_path = ?');
  values.push(fields.graphicFilePath);
}
```

### File Upload (POST `/api/products/[id]/attachment/route.js`)

```js
// 1. request.formData() → file field
// 2. validate extension in ATTACHMENT_EXTENSIONS
// 3. validate size ≤ ATTACHMENT_MAX_BYTES
// 4. const attachDir = path.join(process.cwd(), 'data', 'attachments', params.id)
// 5. fs.mkdirSync(attachDir, { recursive: true })
// 6. clear existing: fs.readdirSync(attachDir).forEach(f => fs.unlinkSync(...))
// 7. sanitize filename: path.basename(file.name)
// 8. fs.writeFileSync(dest, Buffer.from(await file.arrayBuffer()))
// 9. const relPath = `attachments/${params.id}/${safeName}`
// 10. const product = updateProduct(params.id, { graphicFilePath: relPath })
// 11. return Response.json({ product })
```

### File Serving (GET `/api/products/[id]/attachment/route.js`)

```js
// 1. look up product by id → get graphicFilePath
// 2. resolve absolute path: path.join(process.cwd(), 'data', graphicFilePath)
// 3. fs.existsSync check → 404 if missing
// 4. ext → Content-Type map
// 5. return new Response(fs.readFileSync(absPath), { headers: { 'Content-Type': mime } })
```

### File Delete (DELETE `/api/products/[id]/attachment/route.js`)

```js
// 1. look up product → get graphicFilePath → 404 if null
// 2. fs.rmSync(absPath, { force: true })
// 3. updateProduct(params.id, { graphicFilePath: null })
// 4. return Response.json({ product })
```

### OS Open (POST `/api/products/[id]/attachment/open/route.js`)

```js
// 1. look up product → get graphicFilePath
// 2. resolve absPath; fs.existsSync → 404 with re-attach message if missing
// 3. spawn('cmd', ['/c', 'start', '', absPath], { detached: true, stdio: 'ignore', shell: false })
// 4. return Response.json({ opened: true })
```

### File Indicator on `ProductCard`

```jsx
// if (!product.graphicFilePath) render nothing
// const ext = product.graphicFilePath.split('.').pop().toLowerCase()
// PDF: <button aria-label="Deschide grafică PDF" onClick={handleOpenFile}>
//        <FileText className="h-5 w-5 text-muted-foreground" />
//      </button>
// Image: <button aria-label="Deschide grafică" onClick={handleOpenFile}>
//          <img src={`/api/products/${product.id}/attachment`}
//               className="h-8 w-8 rounded object-cover" alt="" />
//        </button>
//
// handleOpenFile: POST /api/products/{id}/attachment/open
//   → on 404: setFileError(data.error)  // show below card
//   → on ok: no UI change
```

### Attachment Section in `ProductDetailsModal`

```jsx
// hidden: <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" ref={fileRef}
//                onChange={handleFileChange} />
//
// No attachment:
//   <Button onClick={() => fileRef.current.click()}>Atașează fișier grafică</Button>
//
// Has attachment (show filename from path.basename(product.graphicFilePath)):
//   <span>{filename}</span>
//   <Button variant="outline" onClick={handleRemove}>Elimină</Button>
//   <Button variant="outline" onClick={() => fileRef.current.click()}>Înlocuiește</Button>
//
// handleFileChange: validate ext client-side → POST FormData
//   → on ok: call onProductUpdated(updatedProduct) to propagate up
// handleRemove: DELETE → onProductUpdated(updatedProduct)
```

### E2E Test Helpers (`tests/e2e/product-attachments.spec.js`)

```js
// Reuse clearOrders() and setupOrderWithProduct() from product-details.spec.js
//
// async function attachFile(request, productId, localFilePath) {
//   const form = new FormData()
//   form.append('file', new Blob([fs.readFileSync(localFilePath)]), path.basename(localFilePath))
//   return request.post(`/api/products/${productId}/attachment`, { multipart: form })
// }
//
// Tests cover: attach image → card shows thumbnail
//              attach pdf → card shows PDF icon
//              reject invalid extension → 400 from API
//              click open → 200 from API
//              delete → card no longer shows indicator
//              persistence: reload page, indicator still visible
```

### Romanian Labels (UI strings)

| Action | Label |
|--------|-------|
| Attach button | "Atașează fișier grafică" |
| Remove button | "Elimină" |
| Replace button | "Înlocuiește" |
| PDF aria-label | "Deschide grafică PDF" |
| Image aria-label | "Deschide grafică" |
| File missing error | "Fișierul nu a fost găsit la calea stocată. Re-atașați fișierul." |
| Invalid type error | "Tip de fișier neacceptat. Tipuri acceptate: PDF, PNG, JPG, JPEG, WEBP." |
