# Feature Specification: Kanban Board for Stationery Order Management

**Feature Branch**: `001-kanban-orders`

**Created**: 2026-06-25

**Status**: Draft

**Input**: User description: "Generează specificațiile tehnice și structura de date pentru o
aplicație web Kanban Board dedicată managementului comenzilor de papetărie (nunți/botezuri).
Include fluxul principal de stări (De făcut, În design, Validare client, Printare, Asamblare,
Livrat) și atributele esențiale ale unui card de comandă (Nume clienți, Dată eveniment, Tip
produse, Status plată)."

## User Scenarios & Testing *(mandatory)*

<!--
  User stories are ordered by business priority. Each story is independently testable —
  implementing any one of them alone yields a usable increment of value.
-->

### User Story 1 - Create and Track a New Order (Priority: P1)

A stationery business manager receives a new order for wedding or baptism stationery. They open
the Kanban board, create a new order card capturing all the client's details, and the card appears
in the "De făcut" column ready to enter the production workflow.

**Why this priority**: This is the core entry point for all business activity. Without order
creation, no other workflow step is possible — it is the foundation of the entire application.

**Independent Test**: Create a new order card, verify all fields are saved correctly, and confirm
the card appears in the "De făcut" column displaying customer names, event date, and payment status.

**Acceptance Scenarios**:

1. **Given** the board is open, **When** the manager fills in the new order form (customer
   name(s), event date, event type, product types, payment status) and submits, **Then** a new
   card appears in the "De făcut" column showing the customer names, event date, and payment
   status indicator.
2. **Given** an order card exists on the board, **When** the manager clicks on it, **Then** a
   detail view opens displaying all order fields in an editable form.
3. **Given** a card's detail view is open, **When** the manager updates the payment status and
   saves, **Then** the card immediately reflects the new payment status without a page reload.

---

### User Story 2 - Move Orders Through the Production Workflow (Priority: P2)

As work progresses on a stationery order, the manager moves the order card through the six
production stages: De făcut → În design → Validare client → Printare → Asamblare → Livrat.
Cards can also be moved backward when rework is needed.

**Why this priority**: Workflow progression is the primary daily interaction. It makes the board
actionable and provides a real-time view of production status across all orders.

**Independent Test**: Move a card from one column to another and verify it stays in the new
column after page refresh, with no duplicate or missing cards.

**Acceptance Scenarios**:

1. **Given** an order card in "De făcut", **When** the manager moves it to "În design" (via
   drag-and-drop or a move action), **Then** the card appears in "În design" and is no longer
   in "De făcut".
2. **Given** an order card in any column, **When** the page is refreshed, **Then** the card
   remains in the same column with all its data intact.
3. **Given** multiple orders spread across different stages, **When** the board loads, **Then**
   every order card appears in its correct column simultaneously.
4. **Given** an order card in "Printare", **When** the manager moves it backward to
   "Validare client" due to a correction, **Then** the card appears in "Validare client".

---

### User Story 3 - Filter and Review Orders by Status or Date (Priority: P3)

The manager needs to quickly identify overdue orders or check outstanding payments. They can
filter the board by payment status or event date range to focus on a relevant subset of cards
without losing the column structure.

**Why this priority**: As order volume grows, scanning all cards becomes impractical. Filtering
enables daily prioritization and financial oversight without navigating away from the board.

**Independent Test**: Create several orders with different payment statuses and event dates.
Apply a payment status filter and verify only matching cards are visible; clear the filter and
verify all cards reappear.

**Acceptance Scenarios**:

1. **Given** orders with mixed payment statuses, **When** the manager selects "Neachitat" in
   the filter, **Then** only cards with "Neachitat" payment status are visible across all columns.
2. **Given** orders with various event dates, **When** the manager sets a date range filter
   (e.g., next 30 days), **Then** only orders whose event date falls within the range are shown.
3. **Given** an active filter is applied, **When** the manager clears the filter, **Then** all
   order cards across all columns are visible again.

---

### Edge Cases

- What happens when a customer cancels an order that is mid-workflow (e.g., already in "Printare")?
- How does the system handle two separate orders for the same client names on the same event date?
- What should be displayed on the board when no orders exist in a column?
- If the browser is closed mid-edit, unsaved changes are lost. The app warns on in-app
  navigation away from an open form, but cannot intercept external browser close events.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow creating a new order with the following required fields: primary
  customer name, event date, event type (wedding / baptism), at least one product type, and
  payment status.
- **FR-002**: System MUST display the board with exactly 6 columns in the fixed order:
  De făcut, În design, Validare client, Printare, Asamblare, Livrat.
- **FR-003**: Users MUST be able to move an order card from its current column to any other
  column in a single action (drag-and-drop or explicit move control).
- **FR-004**: System MUST persist all order data (field values and column position) so that
  cards survive page refreshes and browser restarts.
- **FR-005**: Users MUST be able to view and update all fields of an existing order card through
  a detail view.
- **FR-006**: System MUST support exactly three payment status values: Neachitat, Avans achitat,
  Achitat integral.
- **FR-007**: System MUST allow adding a secondary customer name (e.g., partner's name for
  wedding orders) as an optional field.
- **FR-008**: System MUST allow selecting one or more product types per order from a predefined
  list (invitații, meniu, program, plăcuțe de masă, plic, semn de bun venit, altele).
- **FR-009**: System MUST allow filtering the visible cards by payment status (single status or
  all); the column structure remains visible even when no cards match.
- **FR-010**: System MUST allow filtering the visible cards by event date range; a "next 30 days"
  shortcut MUST be available in addition to a custom date range.
- **FR-011**: System MUST allow deleting an order card after explicit confirmation; deleted orders
  are permanently removed.
- **FR-012**: Each order card face MUST display at minimum: primary customer name (and secondary
  name if present), event date, event type icon or label, and a payment status indicator — all
  without requiring the user to open the detail view.
- **FR-013**: Cards within each column MUST be sorted by event date in ascending order (soonest
  event at the top). Cards with the same event date are sorted by creation timestamp.
- **FR-014**: The order detail form MUST include an explicit "Salvează" (Save) button. No data
  is written to storage until the button is clicked.
- **FR-015**: If the user attempts to close the detail view with unsaved changes, a confirmation
  prompt MUST be displayed warning that changes will be lost.

### Key Entities *(include if feature involves data)*

- **Order**: A single stationery production engagement.
  Attributes: unique identifier, primary customer name, secondary customer name (optional),
  event date (date only — no time), event type (wedding | baptism), product types (list, one or
  more), payment status (Neachitat | Avans achitat | Achitat integral), current workflow stage,
  free-text notes (optional), creation timestamp, last-updated timestamp.

- **WorkflowStage**: A named column on the Kanban board. Attributes: identifier, display name
  (Romanian), fixed sequence position (1 through 6). Stages are system-defined and cannot be
  created, renamed, or deleted by the user.

- **ProductType**: A category of stationery item. The system ships with a standard list:
  Invitații, Meniu, Program, Plăcuțe de masă, Plic, Semn de bun venit, Altele. Custom product
  types may be added by the user and stored persistently.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new order card can be created with all required information in under 2 minutes
  from opening the form to seeing the card on the board.
- **SC-002**: Moving an order card to a different stage requires no more than 1 user action
  (a single drag gesture or a single click on a move control).
- **SC-003**: All 6 Kanban columns and their cards are visible simultaneously on a standard
  1920×1080 desktop display without horizontal scrolling.
- **SC-004**: All order data (card content and stage position) is fully preserved after
  browser refresh or closing and reopening the browser tab.
- **SC-005**: Applying a filter produces visible results within 1 second with no perceived
  loading delay for typical order volumes (up to 200 active orders).
- **SC-006**: Payment status for every card in "Livrat" is identifiable directly from the
  card face without opening the detail view — enabling financial reconciliation at a glance.

## Assumptions

- The application is used by one or two people at a time; real-time multi-user collaboration
  is out of scope for v1.
- No authentication or login is required for v1; the board is openly accessible to anyone
  who has the URL.
- The user interface language is Romanian throughout.
- The application is desktop-first (primary screen: 1920×1080 or larger); mobile responsiveness
  is a future enhancement and not required for v1.
- Product types are initialized from the standard list above; users may add custom types for
  their specific needs.
- Payment status has exactly three states (Neachitat / Avans achitat / Achitat integral); no
  partial-amount tracking is required for v1.
- Orders can be moved freely in both forward and backward directions within the workflow.
- Deleted orders are removed permanently; no archive, undo, or order history is required for v1.
- The application is served from a local server running on the user's machine and accessed via
  http://localhost in a modern desktop browser. No cloud hosting or external server is required.
- A secondary (partner) customer name field is relevant only for wedding orders but the field
  is available regardless of event type for simplicity.
- Order data is stored in a local SQLite database file; no external database server is required.

## Clarifications

### Session 2026-06-25

- Q: What database should be used for data storage? → A: SQLite only; no external database server required.
- Q: Is authentication required in v1? → A: No authentication in v1; the board is openly accessible.
- Q: How will the app be accessed? → A: Local (localhost) — runs on the user's machine, accessed via http://localhost.
- Q: How are cards ordered within a column? → A: By event date, soonest event first (top of column).
- Q: How are changes in the order detail form saved? → A: Explicit "Salvează" button; closing without saving triggers a confirmation warning.
