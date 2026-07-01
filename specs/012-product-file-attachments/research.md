# Research: Product File Attachments (Feature 012)

## Decision 1: File Storage Strategy

**Decision**: Upload file content to the Next.js server; store files at `data/attachments/{productId}/{filename}` on the server's local filesystem. Store only the relative path in the database.

**Rationale**: The app runs as a local Next.js server on a Windows desktop. Web browsers enforce the [Path Information blocking](https://developer.mozilla.org/en-US/docs/Web/API/File/webkitRelativePath) security policy — `<input type="file">` gives JavaScript the file *content* and the bare *filename*, not the full absolute path. A server-side upload is the only way to persist a stable file reference that survives across browser sessions.

**Alternatives considered**:
- *Manual path text input*: User pastes the absolute path. Rejected — poor UX and no validation at attachment time.
- *LocalStorage blob URL*: `URL.createObjectURL()` is ephemeral and does not survive page reload.
- *Electron shell dialog*: Would give full path access, but the project has no Electron dependency and adding it is disproportionate scope.

---

## Decision 2: Database Column Addition

**Decision**: Add a single nullable `graphic_file_path TEXT` column to the existing `products` table using the runtime migration pattern already established in `src/lib/db.js` (column-existence check + `ALTER TABLE`).

**Rationale**: Every past schema extension in this project uses the same pattern. No separate migration files or versioning system is needed for a single nullable column with a sensible `NULL` default.

**Alternatives considered**:
- *Separate `product_attachments` table*: Over-engineered for a single-file-per-product constraint in v1.
- *JSON field in `additional_info`*: Pollutes a text field intended for human-readable notes; hard to query and index.

---

## Decision 3: File Serving for Thumbnails

**Decision**: Serve file content through a new `GET /api/products/[id]/attachment` route. The route reads the file from disk using `fs.readFile` and responds with the correct `Content-Type` header. The `<ProductCard>` renders `<img src="/api/products/{id}/attachment" />` for image files.

**Rationale**: Serving through an API route keeps the `data/` directory outside the web root (not publicly accessible without the API layer), allows server-side path validation before serving, and follows the same pattern as Next.js API route conventions already in the codebase.

**Alternatives considered**:
- *`next.config.js` static serving of `data/`*: Would expose every DB file and seed script. Rejected on security grounds.
- *Base64 data URL stored in DB*: Bloats the SQLite DB with binary data; makes queries slow.

---

## Decision 4: Opening Files in the OS Default Application

**Decision**: A dedicated `POST /api/products/[id]/attachment/open` route calls `child_process.spawn('cmd', ['/c', 'start', '', absolutePath], { detached: true, stdio: 'ignore' })` to open the file in the OS default application. The `ProductCard` click handler fires this API call.

**Rationale**: Only the server has the full absolute path (stored as relative in DB; resolved at runtime with `path.join(process.cwd(), 'data', storedRelativePath)`). A client-side solution cannot invoke `cmd` or `start`; the server-side call is the only clean option. `detached: true` prevents the child process from blocking the Node.js event loop.

**Alternatives considered**:
- *Browser `window.open(blobUrl)`*: Opens in browser tab — does not invoke OS print workflow or PDF reader.
- *`shell.openExternal` (Electron)*: Not available — no Electron dependency.
- *Serving a download response*: Downloads instead of opening; interrupts UX flow.

---

## Decision 5: File Type Detection

**Decision**: Detect type by file extension stored in the filename portion of the path. Extensions `.pdf` → PDF badge (Lucide `FileText` icon). Extensions `.png`, `.jpg`, `.jpeg`, `.webp` → image thumbnail via the API route.

**Rationale**: MIME type detection at serve-time (by extension) is sufficient for these well-known formats. No additional library is needed; the set of supported extensions is fixed and small.

---

## Decision 6: Error Handling for Missing Files

**Decision**: When `POST /api/products/[id]/attachment/open` is called and the file does not exist at the stored path, the server returns `{ error: 'Fișierul nu a fost găsit la calea stocată. Re-atașați fișierul.' }` with HTTP 404. The client shows this message in a toast or inline error.

**Rationale**: File-not-found is a realistic scenario (user moved or deleted the file). The server-side check via `fs.existsSync` is authoritative; the client cannot know whether a server-side path is valid.

---

## Decision 7: No New npm Dependencies

**Decision**: Zero new runtime dependencies. `node:fs`, `node:path`, `node:child_process` are all Node.js built-ins. `Lucide React` (already installed) provides the PDF icon. `<input type="file">` is native HTML.

**Rationale**: Consistent with the project constitution's minimal-dependency posture. Adding a library for a small file-upload feature is disproportionate.
