# Quickstart Validation Guide: Product File Attachments (Feature 012)

## Prerequisites

- App running locally: `npm run dev` → `http://localhost:3000`
- At least one order exists with at least one product (use `npm run seed` or create via UI)
- A sample PDF and sample image file (PNG or JPG) available on your Windows desktop

---

## Scenario 1 — Attach an image file to a product

**Setup**: Open the home page, expand an order, note a product card in the board.

**Steps**:
1. Click the product card to open `ProductDetailsModal`.
2. In the attachment section, click **"Atașează fișier"**.
3. In the OS file picker, navigate to a `.png` or `.jpg` file and click Open.
4. The modal shows the filename and a **"Elimină"** / **"Înlocuiește"** pair.
5. Close the modal.

**Expected outcome**: The product card in the mini-board now shows a small image thumbnail in the bottom-right corner. No page reload occurred.

---

## Scenario 2 — Attach a PDF file to a product

**Steps**:
1. Open a product that has no attachment.
2. Click **"Atașează fișier"** → select a `.pdf` file.
3. Close the modal.

**Expected outcome**: The product card shows a `FileText` icon (not a thumbnail), indicating a PDF is attached.

---

## Scenario 3 — Cards without attachment show no indicator

**Setup**: Ensure at least one product has an attachment (from Scenarios 1 or 2) and at least one product has no attachment.

**Expected outcome**: Products without `graphicFilePath` render normally — no empty box, no placeholder icon. Only products with attachments show a badge.

---

## Scenario 4 — Open attached image in OS default app

**Steps**:
1. On the mini-board, find a product card with an image thumbnail.
2. Click the thumbnail button.

**Expected outcome**: Windows Photo Viewer (or default image viewer) opens the file within 2 seconds. The mini-board remains visible and unchanged.

---

## Scenario 5 — Open attached PDF in OS default app

**Steps**:
1. Click the PDF icon button on a product card that has a PDF attachment.

**Expected outcome**: The system default PDF reader (e.g., Adobe Acrobat, Edge) opens the file. The board is not reloaded.

---

## Scenario 6 — Reject unsupported file types

**Steps**:
1. Open the attachment picker on a product.
2. Attempt to select a `.xlsx` or `.docx` file.

**Expected outcome**: An error message appears: "Tip de fișier neacceptat. Tipuri acceptate: PDF, PNG, JPG, JPEG, WEBP." The product's `graphicFilePath` remains unchanged.

---

## Scenario 7 — Remove an existing attachment

**Steps**:
1. Open the details modal for a product with an attached file.
2. Click **"Elimină"**.
3. Close the modal.

**Expected outcome**: The product card no longer shows any file indicator. The `data/attachments/{productId}/` directory is empty or removed.

---

## Scenario 8 — Replace an existing attachment

**Steps**:
1. Open the details modal for a product with an attached file (note the current filename).
2. Click **"Înlocuiește"** and select a different file.
3. Close the modal.

**Expected outcome**: The product card shows the indicator for the new file type. Clicking the indicator opens the new file. The old file is no longer on disk under `data/attachments/{productId}/`.

---

## Scenario 9 — Missing file error

**Steps**:
1. Attach a file to a product (Scenario 1).
2. Manually delete the file from `data/attachments/{productId}/` using Windows Explorer.
3. Click the file indicator on the product card.

**Expected outcome**: An inline error appears on the card: "Fișierul nu a fost găsit la calea stocată. Re-atașați fișierul." The card does not crash or show an unhandled error.

---

## Scenario 10 — Attachment persists after page reload

**Steps**:
1. Attach a file to a product.
2. Hard-reload the page (`Ctrl+Shift+R`).
3. Expand the order.

**Expected outcome**: The product card still shows the file indicator for the previously attached file.

---

## API Smoke Tests (optional, using curl or Playwright request fixtures)

```bash
# Upload a file
curl -X POST http://localhost:3000/api/products/{id}/attachment \
  -F "file=@/path/to/banner.pdf"
# Expected: 200, product object with graphicFilePath set

# Serve file (thumbnail)
curl -I http://localhost:3000/api/products/{id}/attachment
# Expected: 200, Content-Type: application/pdf

# Open file in OS
curl -X POST http://localhost:3000/api/products/{id}/attachment/open
# Expected: 200, { "opened": true }

# Delete attachment
curl -X DELETE http://localhost:3000/api/products/{id}/attachment
# Expected: 200, product object with graphicFilePath: null
```

See [contracts/api-contracts.md](contracts/api-contracts.md) for full request/response shapes.
