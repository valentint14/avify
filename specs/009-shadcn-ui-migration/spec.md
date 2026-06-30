# Feature Specification: Migration to shadcn/ui + Tailwind CSS v4

**Feature Branch**: `009-shadcn-ui-migration`

**Created**: 2026-06-30

**Status**: Draft

**Input**: User description: "Migrează complet aplicația de la CSS clasic la shadcn/ui (ultimul release) bazat pe Tailwind CSS v4. Înlocuiește toate tabelele, butoanele, dialogurile, inputurile și dropdown-urile native cu componentele corespunzătoare din shadcn (@/components/ui). Toate stilurile noi trebuie scrise exclusiv folosind clase utilitare Tailwind, eliminând complet fișierele .css vechi, păstrând doar configurarea globală."

## Clarifications

### Session 2026-06-30

- Q: What visual direction should the migration adopt? → A: Adopt shadcn/ui's default visual language (shapes, spacing, neutral surfaces), keep the current layout, and re-map the existing semantic accent colors (event type nuntă/botez, statuses, low-stock, collected/delivered) onto the new theme. Pixel-perfect reproduction of the old look is NOT a goal.
- Q: How should the existing E2E tests' selectors (which depend on current CSS classes like `.order-row`, `.edit-modal`, `.material-row`) be handled? → A: Add stable `data-testid` attributes to key elements and update the tests to use them — decoupling tests from styling.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - No Functional Regression After Restyle (Priority: P1) 🎯 MVP

As a user of the application, after the visual overhaul I can still perform every task I could before — managing orders, products, the catalog with recipes, and the materials stock — with identical behavior and data, only with a refreshed, consistent look.

**Why this priority**: A restyle that breaks existing workflows is a net loss. Preserving 100% of current functionality is the non-negotiable foundation; the visual change is only acceptable if nothing the user relies on stops working.

**Independent Test**: Run the existing end-to-end and integration test suites against the migrated UI; every previously passing scenario (order CRUD, product board drag/status, catalog + recipes, materials stock, filters, deductions) still passes, adjusted only for changed markup/class selectors, not for changed behavior.

**Acceptance Scenarios**:

1. **Given** the application has been migrated, **When** a user creates, edits, expands, filters, and deletes orders, **Then** all of these actions work exactly as before with the same results.
2. **Given** the product board, **When** a user moves a product between stages and completes an order, **Then** status changes and the automatic stock deduction behave identically to before.
3. **Given** the catalog and materials pages, **When** a user manages catalog products, recipes, and materials, **Then** all create/edit/delete and validation flows work unchanged.
4. **Given** every previously covered automated test scenario, **When** the suite is run after migration, **Then** all behavioral assertions pass (selectors may be updated, expected behavior may not change).

---

### User Story 2 - Consistent, Modern Component Library (Priority: P2)

As a user, every interactive element of the same kind looks and behaves consistently across the whole application — buttons, text inputs, dropdowns/selects, dialogs, and data lists share one coherent visual language and interaction model.

**Why this priority**: The original motivation for the migration is visual and interaction consistency. Once functionality is preserved (US1), unifying the component set delivers the core value: a polished, predictable interface.

**Independent Test**: Visually and interactively inspect each page; every button shares one style/state set (default, hover, disabled, destructive), every input/select/dialog shares one style, and there are no leftover ad-hoc, inconsistently styled native controls.

**Acceptance Scenarios**:

1. **Given** any page, **When** a user views buttons, **Then** primary, secondary, and destructive buttons share a single consistent style and state behavior across pages.
2. **Given** any form (add order, add product, material form, recipe editor, edit-order modal), **When** a user views inputs and dropdowns, **Then** they are rendered with the unified component styling, not the old bespoke CSS.
3. **Given** any modal/confirmation (edit order, product details, delete confirmations), **When** it opens, **Then** it uses the unified dialog component with consistent overlay, focus handling, and dismissal.
4. **Given** the orders list and other tabular/data displays, **When** a user views them, **Then** they use the unified data-presentation components with consistent spacing, headers, and row styling.

---

### User Story 3 - Accessible Interactions (Priority: P2)

As a keyboard or assistive-technology user, all migrated controls are fully operable: dialogs trap and restore focus, dropdowns and buttons are reachable and actuated by keyboard, and elements expose correct roles and labels.

**Why this priority**: The constitution mandates WCAG 2.1 AA. Adopting an accessible component library is a major reason to migrate; the migration must not regress (and should improve) accessibility.

**Independent Test**: Navigate every interactive flow using only the keyboard and verify focus order, focus trapping in dialogs, visible focus indicators, and that controls announce appropriate roles/labels.

**Acceptance Scenarios**:

1. **Given** any dialog, **When** it opens, **Then** focus moves into it, is trapped while open, and returns to the triggering control on close; Escape closes it.
2. **Given** any dropdown/select, **When** operated with the keyboard, **Then** it can be opened, navigated, and selected without a mouse.
3. **Given** every actionable control, **When** focused, **Then** a visible focus indicator is shown and the control exposes an accessible name.

---

### User Story 4 - Single Styling Approach & Clean Codebase (Priority: P3)

As a developer maintaining the app, all styling is expressed through one utility-based approach with the shared component library; the legacy stylesheets are gone, so there is exactly one place and one way to style the UI.

**Why this priority**: Maintainability is the long-term payoff. It depends on the visible work (US1–US3) being complete, after which removing the old styling system prevents drift back to two competing systems.

**Independent Test**: Confirm the legacy per-component stylesheets no longer exist and are not referenced; confirm new styling is expressed via utility classes and shared components; confirm only the single global stylesheet/theme configuration remains.

**Acceptance Scenarios**:

1. **Given** the migrated codebase, **When** searching for the legacy component stylesheets, **Then** none remain and none are imported anywhere.
2. **Given** any component, **When** inspecting how it is styled, **Then** styling comes from utility classes and shared components, not bespoke per-component CSS files.
3. **Given** the project, **When** inspecting global configuration, **Then** a single global stylesheet/theme entry point remains for tokens and base styles.

---

### Edge Cases

- **Event-type and status accents**: The app currently uses distinct colors for event types (nuntă, botez) and order/product statuses, plus a low-stock warning and collected/delivered indicators. These semantic accents MUST survive the migration (mapped onto the new theme), not be flattened away.
- **Drag-and-drop board**: The Kanban product board relies on native drag-and-drop. Restyling its cards/columns MUST NOT break drag-to-reorder/status-change behavior.
- **Empty, loading, and error states**: Existing empty-list messages, "se încarcă…" states, and inline validation/error messages must be preserved with equivalent meaning in the new components.
- **Responsive layout**: Pages that currently adapt (filter bar wrapping, board horizontal scroll, modal sizing) must remain usable at the same viewport sizes.
- **No literal HTML tables exist today**: "Tables" in the request refers to the orders list and other row/grid data displays; these are migrated to the unified data-presentation components.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The application MUST preserve every existing user-facing capability and behavior after the migration; the change is visual/structural only, with no change to business logic, data, or workflows.
- **FR-002**: All native/bespoke buttons MUST be replaced by the shared button component, covering the existing variants (primary, secondary, destructive) and states (default, hover, focus, disabled, busy).
- **FR-003**: All native/bespoke text inputs, number inputs, textareas, and selects/dropdowns MUST be replaced by the corresponding shared form components.
- **FR-004**: All modals and confirmation prompts (edit order, product details, and the inline delete confirmations for order and product) MUST be replaced by the shared dialog component, retaining current behavior including the two-step delete confirmation pattern.
- **FR-005**: The orders list and other tabular/grid data displays MUST be rendered using the shared data-presentation components with consistent headers, rows, and spacing.
- **FR-006**: New styling MUST be expressed exclusively through utility classes and the shared component library; no new bespoke per-component stylesheet may be introduced.
- **FR-007**: All legacy per-component stylesheets MUST be removed and no longer referenced, leaving only a single global stylesheet/theme configuration entry point.
- **FR-008**: Semantic color accents in use today (event types, order/product status, low-stock warning, collected/delivered indicators) MUST be preserved as theme tokens and remain visually distinguishable.
- **FR-009**: All migrated interactive controls MUST meet WCAG 2.1 AA: keyboard operability, visible focus, correct roles/labels, and dialog focus-trap/restore.
- **FR-010**: The migrated interface MUST remain responsive and usable at the same viewport sizes supported today (desktop-first, with the existing mobile/adaptive behaviors retained).
- **FR-011**: The full existing automated test suite MUST pass after migration; tests may be updated only for changed selectors/markup, not for changed behavior.
- **FR-012**: The migration MUST cover the entire application surface (orders/board, catalog + recipes, materials stock, navigation, all forms/modals) — no page may be left on the legacy styling system.
- **FR-013**: Key interactive and structural elements MUST expose stable `data-testid` attributes, and the E2E tests MUST be updated to select via these test ids rather than via styling classes, so tests are decoupled from the visual implementation.

### Key Entities

This feature does not introduce or change data entities. The relevant "entities" are the UI control categories being unified: **Button**, **Input/Textarea**, **Select/Dropdown**, **Dialog**, and **Data list/table** — each previously bespoke, each replaced by a single shared component.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of previously passing automated test scenarios pass after migration (behavior unchanged).
- **SC-002**: 100% of the application's pages and interactive controls use the shared component library; zero bespoke native controls remain.
- **SC-003**: Zero legacy per-component stylesheets remain in the codebase, and none are referenced; exactly one global styling/theme entry point remains.
- **SC-004**: Every interactive flow is completable using only the keyboard, and every dialog correctly traps and restores focus (100% of dialogs).
- **SC-005**: All semantic accents (event type, status, low-stock, collected/delivered) remain visually distinguishable after migration (verified across every affected view).
- **SC-006**: No user-reported or test-detected functional regression is introduced by the migration.
- **SC-007**: E2E tests select elements via stable `data-testid` attributes (not styling classes), so a future restyle does not break selectors — verifiable by inspecting the updated test suite.

## Assumptions

- **Visual direction**: The app adopts the component library's default design language for shape, spacing, and neutral surfaces, while preserving the application's existing layout/structure and re-mapping its semantic accent colors (event types, statuses, warnings) onto the new theme tokens. A pixel-perfect reproduction of the old look is explicitly NOT a goal; a clean, consistent modern look is.
- **Theme**: A single light theme is in scope. Dark mode / theme switching is out of scope for this migration unless requested separately.
- **"Tables"**: The application has no literal HTML `<table>` elements today; the orders list (accordion rows) and similar grids are what gets migrated to the unified data-presentation components.
- **Drag-and-drop**: The existing product-board drag-and-drop mechanism is retained; only the visual presentation of cards/columns changes.
- **Global configuration retained**: A single global stylesheet remains for theme tokens (colors, radii, spacing) and base resets; this is the only stylesheet kept.
- **Scope boundary**: This is a presentation-layer migration only. No API, database, routing, or business-logic changes are in scope. The recent "always-fresh rendering" behavior and existing motion/animation intent should be preserved (re-expressed via the new styling approach where applicable).
- **Romanian UI language**: All existing Romanian labels, messages, and terminology are preserved verbatim.
