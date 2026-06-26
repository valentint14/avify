# Feature Specification: Order Product Details (Quantity & Notes)

**Feature Branch**: `004-order-product-details`

**Created**: 2026-06-26

**Status**: Draft

**Input**: User description: "Vreau să extind funcționalitatea aplicației pentru a putea adăuga cantitatea și detalii specifice pentru produsele din comenzi. Mai exact, în ecranul principal, în momentul în care creez o comandă nouă și selectez produsele standard din Catalog, vreau să am posibilitatea de a introduce pentru fiecare produs selectat: numărul de bucăți (cantitatea) și un câmp de text pentru 'Informații suplimentare' (unde pot nota detalii despre personalizare, culori, fonturi sau textul dorit de client). Aceste două informații (cantitatea și notele) trebuie să fie vizibile clar și pe cardul fiecărui produs în parte, în interiorul mini-board-ului de tip JIRA care apare când extind o comandă, astfel încât să știu exact ce am de printat sau asamblat când mut produsul dintr-o stare în alta."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enter Quantity and Notes During Order Creation (Priority: P1)

When creating a new order and selecting products from the catalog, the user needs to specify the quantity (number of pieces) and optional additional information (customization details, colors, fonts, client text) for each selected product — all within the same order creation flow, without extra navigation steps.

**Why this priority**: This is the core of the feature. Without the ability to capture quantity and notes at order creation time, the rest of the feature has no data to display. This directly addresses the user's production workflow — knowing what to print or assemble for each item in an order.

**Independent Test**: Can be fully tested by creating a new order, selecting one or more catalog products, filling in quantity and notes for each, and confirming that the values are saved when the order is submitted.

**Acceptance Scenarios**:

1. **Given** a user is creating a new order and has selected at least one product from the catalog, **When** the product selection step is displayed, **Then** each selected product MUST show a quantity input field and an "Informații suplimentare" (additional info) text field beneath its name.
2. **Given** a product is selected, **When** the user enters a positive integer in the quantity field and text in the additional info field, **Then** the system MUST accept and retain both values.
3. **Given** a product is selected, **When** the user submits the order without changing the default quantity, **Then** the quantity defaults to 1 and the order is saved successfully.
4. **Given** a product is selected, **When** the user leaves the additional info field blank, **Then** the system MUST save the product without requiring that field, treating it as optional.
5. **Given** a user enters 0 or a negative number in the quantity field, **When** they attempt to submit the order, **Then** the system MUST display a validation error and prevent saving.

---

### User Story 2 - View Quantity on Card and Notes via Long-Press Modal (Priority: P2)

When expanding an order in the main accordion view, each product card inside the Kanban mini-board must clearly display the saved quantity. Additional info (customization notes) is revealed through a modal that appears when the user long-presses the card for at least 2 seconds, accompanied by a smooth entrance animation — so the card stays clean during normal production flow while details remain easily accessible on demand.

**Why this priority**: Visibility of quantity during production is essential. Additional info is supplementary detail that would clutter the card if always visible; the long-press pattern keeps the board readable while making notes immediately accessible without navigation.

**Independent Test**: Can be fully tested by opening an order with products that have quantity and notes saved, verifying quantity appears on each card, then holding a card for 2 seconds to confirm the modal appears with the correct notes and animation, and dismissing it.

**Acceptance Scenarios**:

1. **Given** an order has products with quantity saved, **When** the user expands that order in the accordion, **Then** each product card MUST display the quantity (number of pieces) visibly on the card face — without any extra interaction.
2. **Given** a product card is being held (long-press), **When** the hold begins, **Then** the card MUST immediately start a gradient fill animation that sweeps across the card over the 2-second duration, giving clear visual feedback that a hold is in progress. When the 2-second threshold is reached, the gradient fill completes and the modal opens.
3. **Given** the modal is open, **When** the user clicks/taps outside the modal or activates a close control, **Then** the modal MUST dismiss smoothly. If the hold is released before 2 seconds, the gradient animation MUST revert immediately and no modal appears.
4. **Given** a product has no additional info, **When** the user long-presses its card, **Then** the modal MUST NOT appear — there is nothing to show, so the long-press has no effect.
5. **Given** a product card is moved from one Kanban column to another, **When** it appears in the new column, **Then** the quantity displayed on the card and the notes accessible via long-press MUST remain unchanged.
6. **Given** the user is on a desktop browser, **When** they press and hold the mouse button on a card for 2 seconds, **Then** the modal MUST appear (long-press works for both mouse and touch input).
7. **Given** a keyboard user navigates to a product card via Tab, **When** they press Enter or Space, **Then** the modal MUST open immediately (no hold required), providing equivalent access to the additional info.

---

### User Story 3 - Edit Quantity and Notes for Products in Existing Orders (Priority: P3)

A user must be able to update the quantity and additional info for products already saved in an existing order, to correct mistakes or respond to client changes without recreating the order.

**Why this priority**: Corrections are inevitable in production workflows. This story is lower priority than creation and display because the app can function without edit capability in a first iteration — the user can work around it — but it is required for a complete, production-ready feature.

**Independent Test**: Can be fully tested by opening an existing order, locating a product, editing its quantity and/or notes, saving, and confirming the updated values appear on the card.

**Acceptance Scenarios**:

1. **Given** an existing order visible in the accordion, **When** the user clicks the "Editează" button in the order's accordion header, **Then** the same modal used for order creation MUST open, prepopulated with the existing products, their saved quantities, and their saved additional info.
2. **Given** a user modifies the quantity or notes for a product, **When** they save the order, **Then** the updated values MUST be persisted and immediately visible on the product card in the Kanban board.
3. **Given** a user clears the additional info field, **When** they save the order, **Then** the product is saved with an empty additional info value and the card omits that section.

---

### Edge Cases

- What happens when the additional info text is very long (hundreds of characters)? The card layout is unaffected (only quantity is shown on the card). The modal must handle long text gracefully — scrollable if it exceeds the modal height.
- What happens if a product is removed from the catalog after an order was created with it? The order product's quantity and notes should remain intact regardless of catalog changes.
- What happens if a user selects many products (e.g., 10+)? The quantity and notes input area must remain usable without excessive scrolling within the creation modal.
- How does the system handle concurrent edits to the same order from two browser tabs? Last write wins; no data conflict resolution is required in v1.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: During order creation, the system MUST display a quantity input field and an "Informații suplimentare" text field for each product selected from the catalog.
- **FR-002**: The quantity field MUST accept only positive integers (minimum value: 1). The system MUST default quantity to 1 when not explicitly changed.
- **FR-003**: The "Informații suplimentare" field MUST be a free-text area. It is OPTIONAL — the system MUST allow saving without it.
- **FR-004**: The system MUST persist the quantity and additional info per product per order when the order is saved.
- **FR-005**: Each product card in the Kanban mini-board inside the expanded order accordion MUST display the saved quantity (number of pieces) directly on the card face, without requiring any user interaction.
- **FR-006**: When a user begins a long-press on a product card, the system MUST immediately start a gradient fill animation that sweeps across the card over 2 seconds, indicating progress toward revealing the modal. If the hold is released before 2 seconds, the animation reverts instantly and no modal appears. When the 2-second threshold is reached, the card animation completes and a modal opens smoothly (no dramatic entrance effect — a clean, subtle transition). The modal MUST contain the product name and its full "Informații suplimentare" text. The modal MUST dismiss when the user clicks/taps outside it or activates a close control.
- **FR-006a**: When a product has no additional info, a long-press on its card MUST have no effect — no modal is shown.
- **FR-006b**: The long-press interaction MUST work for both mouse input (mouse button held) and touch input (finger held). For keyboard users (WCAG 2.1 AA compliance), a product card that receives Tab focus MUST allow the modal to be opened by pressing Enter or Space, with no hold duration required.
- **FR-007**: Each order in the accordion MUST expose an "Editează" button in its header. Clicking it MUST open the same order creation modal, prepopulated with the current products, quantities, and additional info. Changes saved through this modal MUST be persisted and immediately reflected on the product cards in the Kanban board.
- **FR-008**: The system MUST validate that quantity is a positive integer at the point of order creation and order editing, preventing submission with invalid values and displaying a human-readable error message.
- **FR-009**: Quantity and additional info MUST remain visible and accurate when a product card is moved between Kanban columns within the same order board.

### Key Entities

- **OrderProduct**: Represents a product assigned to a specific order. Key attributes: reference to a catalog product, quantity (positive integer, default 1), additionalInfo (optional free text). Belongs to exactly one order. A catalog product MUST appear at most once per order — duplicate entries for the same product within the same order are not permitted. The quantity field covers the full volume for that product within the order.
- **Order**: An existing entity extended to contain one or more OrderProducts, each with its own quantity and notes.
- **CatalogProduct**: An existing entity. Referenced by OrderProduct but not modified by this feature.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can specify quantity and additional info for every selected product during order creation without leaving the order creation flow or performing more than one additional action per product.
- **SC-002**: 100% of product cards in the Kanban board display the quantity directly on the card face. Additional info is accessible via a 2-second long-press: the card shows a gradient fill animation during the hold, and the modal opens with a clean, smooth transition when the threshold is reached.
- **SC-003**: Quantity and notes data survives a page reload — all values displayed after reload match the values entered at creation or last edit.
- **SC-004**: Users can update and save quantity or notes for a product in an existing order in under 30 seconds from opening the order.
- **SC-005**: The card layout does not break for additional info text up to 500 characters — text is displayed in a readable, scrollable modal when revealed via long-press.

## Clarifications

### Session 2026-06-26

- Q: How do keyboard users access the additional info modal (WCAG 2.1 AA)? → A: Product cards are Tab-focusable; Enter or Space opens the modal immediately, without any hold duration. Long-press remains the primary interaction for mouse/touch.
- Q: Can the same catalog product appear more than once in the same order (with different notes)? → A: No — a catalog product appears at most once per order. Quantity covers the full volume; for different customizations, separate orders should be created.
- Q: How does the user enter edit mode for an existing order's products? → A: Via an "Editează" button in the order's accordion header; this reopens the same creation modal prepopulated with existing data.

## Assumptions

- Each product within an order has its own independent quantity and notes — these are per-order-product, not global per catalog product.
- Quantity is always a positive integer. Non-integer quantities (e.g., 0.5) are out of scope.
- The "Informații suplimentare" field has no hard character limit enforced by the system in v1, but UI layout is validated up to 500 characters.
- The current order creation modal uses a multi-select from the product catalog; this feature adds detail fields within that same modal flow.
- Mobile viewport support follows the existing application breakpoints — no new breakpoints are introduced.
- The feature does not change the Kanban columns or the stage-transition logic — it only adds data display to existing cards.
- Concurrent order editing from multiple sessions is out of scope for conflict resolution; last write wins.
