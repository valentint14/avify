# Feature Specification: Product File Attachments

**Feature Branch**: `012-product-file-attachments`

**Created**: 2026-07-01

**Status**: Draft

**Input**: User description: "Extinde tabela de produse și interfața mini-board-ului pentru a permite atașarea de fișiere locale (PDF/imagini) pe fiecare produs. Vreau să pot încărca, stoca o cale locală și vizualiza fișierul de grafică aprobat direct pe cardul produsului din mini-board, pentru acces rapid la print."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Attach Graphic File to Product (Priority: P1)

A user opens a product and attaches a locally stored graphic file (PDF or image) representing the approved print-ready artwork. The system records the file path so the graphic can be accessed later directly from the product card.

**Why this priority**: This is the core enabling action — without attaching a file, none of the downstream viewing or printing workflows are possible.

**Independent Test**: Can be fully tested by opening a product's detail view, using the file-picker to select a local PDF or image, saving, and then confirming the file path appears as attached to the product record.

**Acceptance Scenarios**:

1. **Given** a product with no attached graphic, **When** the user opens the product and uses the attach-file control, **Then** a file picker opens filtered to PDF and image types (PNG, JPG, JPEG, WEBP).
2. **Given** the user selects a valid local file and confirms, **When** the form is saved, **Then** the product record is updated with the selected file's local path and a success confirmation is shown.
3. **Given** the user attempts to select a non-supported file type (e.g., `.xlsx`), **When** they confirm the file picker, **Then** the system rejects the file and displays a clear error message listing accepted types.

---

### User Story 2 - View Graphic on Mini-Board Product Card (Priority: P1)

A user working on an order's mini-board sees that a product has an attached graphic file. The product card shows a visual indicator (thumbnail for images, PDF badge for PDFs) so the user knows a print-ready file is available without opening the full product detail.

**Why this priority**: The primary motivation for this feature is quick-access from the mini-board. If the card doesn't surface the file, users must navigate away from the board each time — defeating the purpose.

**Independent Test**: After attaching a file via User Story 1, open the mini-board for any order that includes that product and confirm the product card shows the visual indicator, with no other navigation required.

**Acceptance Scenarios**:

1. **Given** a product with an attached image file, **When** the mini-board is rendered, **Then** the product card shows a thumbnail preview of the image.
2. **Given** a product with an attached PDF file, **When** the mini-board is rendered, **Then** the product card shows a PDF indicator icon (not a thumbnail) alongside the product name.
3. **Given** a product with no attached file, **When** the mini-board is rendered, **Then** the product card shows no file indicator — no empty placeholder that adds visual noise.

---

### User Story 3 - Open Graphic File from Product Card (Priority: P1)

A user clicks the file indicator on a product card in the mini-board and the attached graphic opens immediately using the operating system's default application for that file type, ready for review or sending to print.

**Why this priority**: Viewing the file is the end goal of the entire feature — "acces rapid la print." This is what transforms the stored path into a workflow benefit.

**Independent Test**: From the mini-board, click the file indicator on a product card and confirm the OS opens the file in the default viewer (e.g., the system PDF reader or image viewer).

**Acceptance Scenarios**:

1. **Given** a product card displaying a file indicator, **When** the user clicks the indicator, **Then** the OS default application opens the file at the stored local path.
2. **Given** the stored file path is no longer valid (file was deleted or moved), **When** the user clicks the indicator, **Then** a user-readable error explains the file cannot be found and suggests re-attaching.

---

### User Story 4 - Remove or Replace Graphic File (Priority: P2)

A user removes an outdated graphic from a product or replaces it with a new approved version.

**Why this priority**: Attachments will change as artwork is revised. Without replace/remove, the product accumulates stale data and users lose trust in what they see.

**Independent Test**: After attaching a file via User Story 1, open the product again, use the remove or replace control, save, and confirm the product card on the mini-board no longer shows the old file indicator.

**Acceptance Scenarios**:

1. **Given** a product with an attached file, **When** the user clicks "Remove" on the attachment control and saves, **Then** the product record clears the file path and the card no longer shows a file indicator.
2. **Given** a product with an attached file, **When** the user picks a new file via the attachment control and saves, **Then** the product record updates to the new path and the card reflects the new file.

---

### Edge Cases

- What happens when the attached file path contains special characters or non-Latin characters (e.g., Romanian diacritics in folder names)?
- How does the system handle a file that is on a network share or removable drive that is temporarily offline?
- What if two products in the same order reference the same file path — is that valid?
- What if the path is extremely long (near OS path-length limits)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow a file path (pointing to a local PDF or image file) to be associated with each product record.
- **FR-002**: System MUST persist the file path association so it survives page reload and application restart.
- **FR-003**: System MUST display a visual indicator on the product card within the mini-board when a graphic file is attached — a thumbnail for image files, a badge/icon for PDFs.
- **FR-004**: System MUST open the attached file in the OS default application when the user activates the file indicator on the product card.
- **FR-005**: System MUST restrict file selection to supported types: PDF, PNG, JPG, JPEG, WEBP.
- **FR-006**: System MUST validate that the selected file exists and is accessible at attachment time, displaying a clear error if not.
- **FR-007**: Users MUST be able to remove an existing file attachment from a product, clearing the stored path.
- **FR-008**: Users MUST be able to replace an existing file attachment by selecting a new file, overwriting the stored path.
- **FR-009**: System MUST display a human-readable error when the user attempts to open a file that no longer exists at the stored path.
- **FR-010**: System MUST NOT display a file indicator on product cards that have no attachment.

### Key Entities *(include if feature involves data)*

- **Product**: Extended with an optional `graphic_file_path` attribute — a string containing the absolute local path to the approved graphic file. Null/absent means no file is attached.
- **Attachment**: Conceptually represents the association between a product and a local file; not a separate stored entity — encoded directly as an attribute on the Product.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can attach a graphic file to a product and have it reflected on the mini-board in under 30 seconds from start to finish.
- **SC-002**: The attached file opens in the OS application within 2 seconds of clicking the indicator on the product card.
- **SC-003**: 100% of product cards that have an attachment display the correct visual indicator; 100% of cards without an attachment display no indicator.
- **SC-004**: File removal and replacement complete without page reload and the card updates immediately to reflect the new state.
- **SC-005**: Unsupported file types are rejected 100% of the time with a clear, actionable error message.

## Assumptions

- The application runs on a local desktop environment (Windows) with direct access to the local file system — this is not a web-deployed or cloud-hosted scenario.
- Only one graphic file per product is supported in this version; multiple attachments per product are out of scope.
- File viewing delegates entirely to the OS default application; in-app preview beyond thumbnails is out of scope for this version.
- "Mini-board" refers to the existing order product board (the drag-and-drop Kanban-style view of products per order) already present in the application.
- The product table schema can be extended with a new nullable column for the file path; existing products will have no file attached by default.
- Image thumbnails are generated from the stored file at render time; no separate thumbnail caching is required for v1.
- File path validation at open-time (not just at attach-time) is sufficient; the system is not responsible for tracking file moves after attachment.
