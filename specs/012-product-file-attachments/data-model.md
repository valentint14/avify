# Data Model: Product File Attachments (Feature 012)

## Database Changes

### `products` table — new column

| Column             | Type   | Nullable | Default | Description                                              |
|--------------------|--------|----------|---------|----------------------------------------------------------|
| `graphic_file_path` | TEXT  | YES      | NULL    | Relative path from `data/` to the attached graphic file. Example: `attachments/abc-123/banner.pdf`. NULL means no file attached. |

**Migration**: Added in `src/lib/db.js` `openDb()` using the existing column-existence pattern:

```js
if (!cols.some((c) => c.name === 'graphic_file_path')) {
  db.exec('ALTER TABLE products ADD COLUMN graphic_file_path TEXT');
}
```

No new tables, no indexes required (the column is accessed via the existing `WHERE id = ?` primary-key lookup).

---

## File System Layout

```text
data/
├── avify.db                         ← existing SQLite database
└── attachments/
    └── {productId}/                 ← one directory per product that has a file
        └── {originalFilename}       ← e.g., banner.pdf, label_v3.png
```

- Stored path in DB (relative to `process.cwd()/data`): `attachments/{productId}/{filename}`
- Absolute path resolved at runtime: `path.join(process.cwd(), 'data', storedRelativePath)`
- Only one file per product directory is maintained; uploading a new file removes any existing file in that directory first.
- Supported filenames: characters valid on Windows NTFS; the original filename from the upload is sanitized (strip path separators, keep extension).

---

## In-Memory Product Object (extended)

```js
{
  id: string,          // UUID
  orderId: string,     // FK → orders.id
  name: string,
  status: string,      // one of 6 workflow stages
  templateId: string | null,
  quantity: number,
  additionalInfo: string | null,
  unitPrice: number,
  graphicFilePath: string | null,   // NEW — relative path or null
  createdAt: string,   // ISO timestamp
}
```

`graphicFilePath` is exposed on every `parseRow()` call; callers already receiving the product object (ProductCard, API responses) see it immediately without any additional query.

---

## Derived View: File Attachment State

Used by `ProductCard` to decide rendering:

| Condition                                    | Card indicator       |
|----------------------------------------------|----------------------|
| `graphicFilePath === null`                   | None (no indicator)  |
| `graphicFilePath` ends with `.pdf`           | PDF icon (FileText)  |
| `graphicFilePath` ends with `.png`/`.jpg`/`.jpeg`/`.webp` | Image thumbnail via API |

---

## API Contract Summary

| Method | Path                                         | Purpose                            |
|--------|----------------------------------------------|------------------------------------|
| GET    | `/api/products/{id}/attachment`              | Serve file content (thumbnail/download) |
| POST   | `/api/products/{id}/attachment`              | Upload/replace attached file       |
| DELETE | `/api/products/{id}/attachment`              | Remove attachment, delete file     |
| POST   | `/api/products/{id}/attachment/open`         | Open file in OS default app        |

Full request/response contracts are in [contracts/api-contracts.md](contracts/api-contracts.md).
