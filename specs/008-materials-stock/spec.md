# Feature Specification: Materials Stock & Recipe-Based Consumption

**Feature Branch**: `008-materials-stock`

**Created**: 2026-06-29

**Status**: Draft

**Input**: User description: "Adaugă o pagină numită 'Stoc Materiale' pentru gestionarea materiilor prime (carton, satin, ceară etc.), fiecare având câmpurile: Stoc Actual, Stoc Minim și Unitate măsură. În Catalogul de Produse, permite definirea unei rețete prin selectarea materialelor și a cantității necesare per bucată (ex: 1 invitație = 1 foaie carton, 0.2m satin). Declanșează o alertă permanentă pe pagină când Stocul Actual scade sub Stocul Minim. La finalizarea unei comenzi, scade automat din 'Stoc Materiale' cantitățile totale consumate (Cantitate produs × Consum per bucată)."

## Clarifications

### Session 2026-06-29

- Q: What triggers "order completion" that auto-deducts stock? → A: Automatically when all of the order's products reach the "gata" stage (the order reaches its existing finalized state); a stored per-order marker guarantees deduction happens exactly once.
- Q: When a completed (already-deducted) order is deleted, what happens to the consumed stock? → A: Stock is NOT restored — deduction is permanent; any correction is done manually from the "Stoc Materiale" page.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manage Raw Materials Inventory (Priority: P1)

A user opens a dedicated "Stoc Materiale" page to record and maintain the raw materials they use (e.g. carton, satin, ceară). For each material they set a name, the current stock on hand, a minimum stock threshold, and a unit of measure. They can add new materials, edit existing ones, and remove materials no longer used.

**Why this priority**: Without a materials inventory there is nothing for recipes to reference, no alerts to raise, and nothing to deduct from. This is the foundational data layer and delivers immediate standalone value as a simple stock register.

**Independent Test**: Navigate to the "Stoc Materiale" page, add a material with a name, current stock, minimum stock and unit, reload the page — the material persists with all values. Edit its current stock and delete another material; both changes persist.

**Acceptance Scenarios**:

1. **Given** the "Stoc Materiale" page is open, **When** the user adds a material named "Carton" with current stock 100, minimum stock 20 and unit "foi", **Then** the material appears in the list and persists across a page reload.
2. **Given** an existing material, **When** the user edits its current stock value and saves, **Then** the new value is shown and persisted.
3. **Given** an existing material, **When** the user deletes it, **Then** it is removed from the list and does not reappear after reload.
4. **Given** the user is adding a material, **When** they leave the name empty, **Then** the material is not created and a validation message is shown.
5. **Given** a navigation bar is present, **When** the user looks at the top navigation, **Then** a "Stoc Materiale" link is available and navigates to the page.

---

### User Story 2 - Define Product Recipes (Priority: P2)

In the Product Catalog, a user defines a "recipe" for a catalog product by selecting one or more materials and specifying the quantity of each material consumed per single piece of that product (e.g. 1 invitație = 1 foaie carton + 0.2 m satin). The recipe is saved with the catalog product and can be edited later.

**Why this priority**: Recipes connect products to materials and are the prerequisite for automatic consumption. They have no value until materials exist (US1), but they are required before any deduction (US4) can occur.

**Independent Test**: Open a catalog product, add two recipe lines selecting two different materials with per-piece quantities, save, reopen the product — both recipe lines are shown exactly as entered.

**Acceptance Scenarios**:

1. **Given** materials exist and a catalog product is open, **When** the user adds a recipe line selecting "Carton" with quantity 1 per piece, **Then** the line is saved and shown on the product.
2. **Given** a catalog product with an existing recipe, **When** the user adds a second material "Satin" with quantity 0.2 per piece and saves, **Then** the product shows both recipe lines after reopening.
3. **Given** a recipe line exists, **When** the user changes its per-piece quantity or removes the line, **Then** the change persists.
4. **Given** the user is adding a recipe line, **When** they enter a zero or negative per-piece quantity, **Then** the line is rejected with a validation message.
5. **Given** a material is already used in a product's recipe, **When** the user opens the material selector for that product, **Then** the same material cannot be added twice to the same recipe.

---

### User Story 3 - Low-Stock Alert (Priority: P2)

When any material's current stock drops below its minimum stock threshold, the "Stoc Materiale" page displays a persistent, clearly visible alert identifying which materials are below threshold, so the user knows to reorder.

**Why this priority**: The alert turns the inventory from a passive register into an actionable tool. It depends only on US1 data and is independently demonstrable.

**Independent Test**: Set a material's current stock below its minimum, open the page — a persistent alert lists that material as low. Raise the current stock above the minimum — the alert for that material disappears.

**Acceptance Scenarios**:

1. **Given** a material has current stock below its minimum stock, **When** the "Stoc Materiale" page is displayed, **Then** a persistent alert is shown naming that material.
2. **Given** multiple materials are below their minimums, **When** the page is displayed, **Then** the alert lists all materials currently below threshold.
3. **Given** no material is below its minimum, **When** the page is displayed, **Then** no low-stock alert is shown.
4. **Given** a low-stock alert is shown, **When** the user raises the material's current stock to or above the minimum and saves, **Then** the alert updates to no longer include that material.
5. **Given** a material's current stock exactly equals its minimum stock, **When** the page is displayed, **Then** that material is NOT treated as below threshold (alert triggers only when strictly below).

---

### User Story 4 - Automatic Consumption on Order Completion (Priority: P3)

When an order is completed, the system automatically reduces the current stock of each material by the total quantity consumed across all products in that order, computed as the product's ordered quantity multiplied by the per-piece consumption defined in its recipe. Deduction happens exactly once per order.

**Why this priority**: This is the headline automation but it depends on materials (US1) and recipes (US2) both being in place, and it is the most complex behaviour. It is delivered last so the simpler increments can ship first.

**Independent Test**: Define a material with current stock 100 and a product recipe consuming 2 per piece. Create an order with 10 of that product and complete it. The material's current stock becomes 80. Completing the same order again does not deduct a second time.

**Acceptance Scenarios**:

1. **Given** material "Carton" has current stock 100 and product "Invitație" has a recipe of 1 Carton per piece, **When** an order containing 30 Invitație is completed, **Then** Carton current stock becomes 70.
2. **Given** a product recipe consumes 0.2 m satin per piece, **When** an order with 10 of that product is completed, **Then** satin stock is reduced by 2 m.
3. **Given** an order has multiple products that share a material in their recipes, **When** the order is completed, **Then** the material is reduced by the summed consumption across all those products.
4. **Given** an order has already been completed and its stock deducted, **When** the order is completed again (or its completion state is re-evaluated), **Then** no additional deduction occurs.
5. **Given** completing an order would reduce a material below its minimum stock, **When** the order is completed, **Then** the deduction still applies and the low-stock alert (US3) reflects the new below-threshold state.
6. **Given** a product in the order has no recipe defined, **When** the order is completed, **Then** that product contributes no deduction and the completion still succeeds for the other products.

---

### Edge Cases

- A product with no recipe contributes nothing to consumption; order completion still succeeds.
- An order containing products whose recipe references a deleted material: the deletion of a material removes it from recipes, so completion simply skips it (no error).
- Completing an order whose required consumption exceeds available stock: the deduction proceeds and the resulting (possibly zero or negative) stock is surfaced via the low-stock alert. Stock is not blocked from going below minimum or zero by this feature.
- Editing an order's product quantities after completion: out of scope for re-deduction — deduction is a one-time event at completion (see Assumptions).
- Deleting a completed order whose stock was already deducted: stock is NOT restored; the consumed amounts remain deducted and any correction is manual (FR-018).
- A recipe quantity entered with decimals (e.g. 0.2) must be supported, not just whole numbers.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a dedicated "Stoc Materiale" page, reachable from the application's top navigation.
- **FR-002**: Users MUST be able to create a material with a name, current stock (number), minimum stock (number), and unit of measure (text, e.g. "foi", "m", "g").
- **FR-003**: Users MUST be able to edit any field of an existing material and delete a material.
- **FR-004**: The system MUST reject creating or saving a material with an empty name and show a validation message.
- **FR-005**: Current stock and minimum stock MUST accept non-negative decimal values; unit of measure is a free-text label.
- **FR-006**: The system MUST persist all materials and their values across page reloads and sessions.
- **FR-007**: In the Product Catalog, users MUST be able to define a recipe for a catalog product as a set of recipe lines, each pairing a material with a per-piece consumption quantity.
- **FR-008**: The per-piece consumption quantity MUST be a positive number (greater than zero) and MUST support decimals; the system MUST reject zero or negative values with a validation message.
- **FR-009**: A given material MUST NOT appear more than once in the same product's recipe.
- **FR-010**: Users MUST be able to add, edit, and remove recipe lines on a catalog product, with changes persisted.
- **FR-011**: The "Stoc Materiale" page MUST display a persistent alert whenever one or more materials have current stock strictly below their minimum stock, naming each affected material.
- **FR-012**: The low-stock alert MUST NOT be shown for a material whose current stock is greater than or equal to its minimum stock.
- **FR-013**: An order MUST be considered "completed" for consumption purposes when all of its products reach the final "gata" stage (the order's existing finalized state). No separate manual completion action is required.
- **FR-014**: When an order becomes completed, the system MUST reduce each material's current stock by the total consumed quantity, computed as the sum over all products in the order of (ordered product quantity × that product's per-piece consumption of the material).
- **FR-015**: The system MUST deduct stock for an order exactly once, tracked by a stored per-order "stock deducted" marker; re-completing or re-evaluating an already-deducted order MUST NOT deduct again.
- **FR-016**: Order completion MUST succeed even when some or all products have no recipe; products without a recipe contribute zero consumption.
- **FR-017**: Deduction MUST apply even when it brings a material to or below its minimum (or below zero); the feature does not block completion on insufficient stock.
- **FR-018**: Deleting an order MUST NOT restore any stock previously deducted for it; deduction is permanent and corrections are made manually via the "Stoc Materiale" page.

### Key Entities

- **Material**: A raw material in inventory. Attributes: name (e.g. "Carton"), current stock (number), minimum stock (number), unit of measure (text). Has a status relative to its threshold (below minimum or not).
- **Recipe Line**: An association between a catalog product and a material, carrying the per-piece consumption quantity (positive decimal). A catalog product has zero or more recipe lines; each material appears at most once per product.
- **Order Completion Event**: The point at which an order is considered complete and its material consumption is applied. Carries a one-time "stock already deducted" marker to guarantee single deduction.
- **Catalog Product** (existing): Extended to own a recipe (a collection of recipe lines).
- **Order / Order Product** (existing): The ordered product quantity is the multiplier applied to per-piece consumption.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can add a new material and see it listed in under 30 seconds, with values intact after reload.
- **SC-002**: A user can define a two-material recipe on a catalog product and have it reappear exactly on reopening, with no data loss.
- **SC-003**: When a material falls below its minimum, the low-stock alert appears on the page without any manual refresh action beyond viewing the page, and correctly names every below-threshold material.
- **SC-004**: Completing an order reduces each involved material's stock by exactly (ordered quantity × per-piece consumption) summed across products — verifiable by comparing stock before and after.
- **SC-005**: Re-completing an already-completed order produces zero additional stock change in 100% of cases (no double deduction).
- **SC-006**: Order completion succeeds in 100% of cases regardless of whether products have recipes or whether stock would go below minimum.

## Assumptions

- "Finalizarea unei comenzi" (order completion) corresponds to the order reaching its completed/finalized state — i.e. when all of its products are in the final "gata" stage, consistent with the existing order status model. A stored marker records that an order's stock has been deducted so the one-time guarantee (FR-014) holds even though completion status is otherwise derived.
- Deduction is a one-time event tied to the order first becoming complete. Subsequent edits to product quantities, reverting and re-completing, recipe changes, or deleting the order do NOT retroactively adjust, re-run, or reverse the deduction. Manual stock correction via the "Stoc Materiale" page is the mechanism for any after-the-fact adjustment.
- Stock values and consumption quantities are decimals (e.g. 0.2 m satin); negative current stock is permitted as a result of over-consumption and is simply surfaced by the alert.
- Recipes are defined on catalog products (the reusable product templates), not on ad-hoc per-order products. Ad-hoc products without a catalog recipe contribute zero consumption.
- Units of measure are free-text labels for display only; the system does not perform unit conversion (a recipe's quantity is assumed to be in the same unit as the referenced material's stock).
- Deleting a material removes it from any product recipes that reference it.
- The low-stock alert is shown on the "Stoc Materiale" page; broader cross-application notification (e.g. a global badge) is out of scope for this feature.
