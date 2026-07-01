# Feature Specification: Client Design Approval Portal

**Feature Branch**: `015-client-design-approval`

**Created**: 2026-07-01

**Status**: Draft

**Input**: User description: "Generează o rută dinamică publică gen /aprobare/[uuid] (fără login). Pagina va afișa produsele unei comenzi și fișierele grafice atașate. Adaugă un buton de 'Aprobă design' pentru client; la click, respectivul produs aprobat sa apara evidentiat cu verde."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Client Views and Approves Product Designs (Priority: P1)

A studio shares a private approval link with a client (e.g., via email or WhatsApp). The client opens the link in any browser — no account required. They see each product from their order alongside the graphic files attached to it. For each product, a prominent "Aprobă design" button is shown. When the client clicks the button for a specific product, that product's card immediately turns green to confirm approval. The client can approve products one at a time, in any order. The approved state is remembered — if the client closes and reopens the link, already-approved products remain highlighted in green.

**Why this priority**: This is the core value of the feature. Without it, approval happens over email or phone calls — slow, error-prone, and undocumented. The one-click approval workflow eliminates back-and-forth and gives the studio a clear, persisted record of what the client has signed off on.

**Independent Test**: Can be fully tested by creating an order with two products, each having at least one file attachment, generating an approval token for the order, opening `/aprobare/[uuid]` in a browser without logging in, clicking "Aprobă design" for one product, and verifying that product turns green while the other remains unchanged — and that the green state persists after page reload.

**Acceptance Scenarios**:

1. **Given** a valid approval link `/aprobare/[uuid]`, **When** the client opens it without being logged in, **Then** the page MUST load and display all products from the linked order, each with its attached graphic files.
2. **Given** the approval page is loaded, **When** the client clicks "Aprobă design" on a product, **Then** that product card MUST immediately change to a green visual state and the button MUST be replaced or updated to reflect the approved status.
3. **Given** the client approved one or more products and then navigates away, **When** the client opens the same link again, **Then** previously approved products MUST still be highlighted in green, reflecting the persisted approval state.
4. **Given** the approval page is loaded, **When** a product has multiple attached graphic files, **Then** all attached files for that product MUST be visible and previewable before the client approves.
5. **Given** the approval page is loaded, **When** a product has no attached graphic files, **Then** the product MUST still be listed with a clear indication that no files have been attached yet, and the "Aprobă design" button MUST be disabled or hidden for that product.

---

### User Story 2 - Studio Monitors Approval Status (Priority: P2)

A studio employee opens an existing order in the internal app and can see which products have been client-approved (highlighted in green or marked with a badge). This allows the production team to start work confidently on approved designs without waiting for a verbal confirmation.

**Why this priority**: Persisting approval status only has value if the studio can act on it. Without visibility into approval status in the internal order view, the approval loop is incomplete — the studio must still contact the client to verify.

**Independent Test**: Can be fully tested by having a client approve one product via the public link, then opening the corresponding order in the internal app and verifying that product shows a visible approved indicator.

**Acceptance Scenarios**:

1. **Given** a client has approved at least one product via the public link, **When** a studio employee views that order internally, **Then** the approved product(s) MUST show a visible "Aprobat" indicator or green highlight that is distinct from non-approved products.
2. **Given** no products have been approved yet, **When** the studio employee views the order, **Then** no products MUST show the approved indicator — the absence of approval is the neutral state.

---

### User Story 3 - Invalid or Unknown Approval Link (Priority: P3)

A user opens an approval link that is malformed, expired, or simply wrong. The page must handle this gracefully — without crashing or exposing internal error details.

**Why this priority**: Any public URL can be mistyped or shared incorrectly. A clear, user-friendly error screen is required so the client knows to contact the studio for a corrected link, rather than assuming the app is broken.

**Independent Test**: Can be fully tested by opening `/aprobare/invalid-uuid-that-does-not-exist` and verifying a user-friendly "link invalid" message is shown without any stacktrace or technical error detail.

**Acceptance Scenarios**:

1. **Given** the UUID in the URL does not match any approval token in the system, **When** the client opens the link, **Then** the page MUST show a user-friendly message (e.g., "Acest link de aprobare nu este valid sau a expirat. Contactați studioul pentru un nou link.") and MUST NOT expose any internal error or stack trace.
2. **Given** the URL is malformed (e.g., no UUID segment), **When** the client opens the link, **Then** the same user-friendly error MUST be displayed.

---

### Edge Cases

- What happens when all products in an order are approved? The page MUST remain accessible and show all products in the green/approved state — no redirect or auto-close.
- What happens if the same approval link is opened simultaneously by two people (e.g., client and studio)? Each approval action MUST be persisted immediately; the last state persists.
- What happens if a product is removed from the order after the client approves it? The approval record for the removed product is orphaned — the client page shows only products still part of the order.
- What happens when a graphic file attachment fails to load (e.g., corrupted file)? The file MUST show a broken-file placeholder with a download link as fallback — the rest of the page MUST remain functional.
- What happens if the client tries to approve a product with no files? The "Aprobă design" button MUST be disabled — approval without seeing the design is not permitted.
- What happens when the order has a very large number of products (20+)? The page MUST be scrollable and each product card MUST remain fully readable without horizontal overflow.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST expose a public route `/aprobare/[uuid]` that renders without requiring the visitor to be authenticated.
- **FR-002**: The `uuid` in the route MUST correspond to an approval token stored in the system, linked to a specific order.
- **FR-003**: The page MUST display the order's name or identifier as a page title, so the client can confirm they are viewing the correct order.
- **FR-004**: The page MUST list all active products belonging to the linked order, with each product shown as a distinct card.
- **FR-005**: Each product card MUST display the product name, quantity, and all graphic files attached to that product, with the ability to preview or download each file.
- **FR-006**: Each product card with at least one attached file MUST include an "Aprobă design" button.
- **FR-007**: Product cards with no attached files MUST display the "Aprobă design" button in a disabled state, with a visible explanation (e.g., "Niciun fișier atașat").
- **FR-008**: When the client clicks "Aprobă design" for a product, the system MUST persist the approval status for that product against the approval token.
- **FR-009**: After a successful approval action, the product card MUST immediately update to a green visual state indicating approval, and the button MUST change to reflect the approved status (e.g., "Design aprobat ✓") and become non-clickable.
- **FR-010**: When the page loads, the system MUST retrieve and display the current approval status for all products — previously approved products MUST already show the green highlighted state.
- **FR-011**: If the UUID does not match any approval token, the page MUST display a user-friendly error message in Romanian and MUST NOT expose any system internals.
- **FR-012**: The approval action MUST be idempotent — clicking "Aprobă design" on an already-approved product (e.g., via a race condition) MUST NOT create duplicate approval records.
- **FR-013**: The page MUST be fully usable on mobile viewports (minimum 375px wide) without horizontal scrolling.
- **FR-014**: The page MUST NOT include any internal navigation, authentication prompts, or references to the studio's internal interface — it is a standalone, client-facing view.

### Key Entities *(include if feature involves data)*

- **Approval Token**: A unique, unguessable identifier (UUID) linked to a specific order. Created by the studio and shared with the client. Enables unauthenticated access to the approval page for that specific order.
- **Comandă (Order)**: The order being reviewed. Has a name/identifier and a list of associated products.
- **Produs din comandă (Order Product)**: A product within the order displayed on the approval page. Has a name, quantity, and zero or more attached graphic files. Carries an approval status.
- **Fișier grafic (Graphic File Attachment)**: A file attached to a specific product (from the file attachments feature). Displayed on the approval page for client review before approval.
- **Approval Status**: A per-product, per-token record indicating whether the client has approved the design. States: `pending` (not yet approved) and `approved`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The approval page loads and is fully readable within 3 seconds on a standard mobile connection, even when an order contains 10 products each with 3 file attachments.
- **SC-002**: The client can view all product designs and complete approval of all products in a single session in under 5 minutes for an order with up to 10 products.
- **SC-003**: Approval status is persisted within 1 second of the client clicking the button — verified by reloading the page and confirming the green state is present.
- **SC-004**: 100% of approval clicks by the client are recorded correctly — no approvals lost due to concurrent access or network retry.
- **SC-005**: The page renders correctly with no horizontal overflow on viewports as narrow as 375px.
- **SC-006**: An invalid or unknown approval UUID always results in a user-friendly error page — no blank screens, no stack traces, no HTTP error codes shown to the client.

## Assumptions

- The mechanism for generating and sharing approval tokens (e.g., a "Generează link aprobare" button inside the order detail page) is out of scope for this feature; this spec covers only the public approval page itself.
- Each order has at most one active approval token at a time; token management and revocation are out of scope for v1.
- Graphic file attachments are already stored by the existing file attachment feature (feature 012); this feature reads and displays them but does not manage uploads.
- Approval is per-product, not per-file — the client approves the design for a product as a whole, not individual files.
- Approval is one-directional: once a product is approved by the client, the approval cannot be revoked from the public page. Reverting an approval (if needed) is an internal admin action, out of scope for v1.
- The approval token does not expire in v1; permanent links are acceptable for the current workflow.
- The page does not require HTTPS enforcement at the application level — that is handled at the infrastructure/deployment level.
- Product status (`realizat`, `de_realizat`, etc.) does not affect visibility on the approval page — all products in the order are shown, regardless of production status.
- No notification (email, SMS) is sent to the studio when the client approves — studio employees check approval status manually in the internal order view.
