const { test, expect } = require('@playwright/test');

// ── API helpers (setup / teardown) ──────────────────────────────
async function clearMaterials(request) {
  const { materials } = await (await request.get('/api/materials')).json();
  await Promise.all(materials.map((m) => request.delete(`/api/materials/${m.id}`)));
}
async function clearOrders(request) {
  const { orders } = await (await request.get('/api/orders')).json();
  await Promise.all(orders.map((o) => request.delete(`/api/orders/${o.id}`)));
}
async function clearCatalog(request) {
  const { templates } = await (await request.get('/api/catalog')).json();
  await Promise.all(templates.map((t) => request.delete(`/api/catalog/${t.id}`)));
}
async function createMaterial(request, data) {
  return (await request.post('/api/materials', { data })).json();
}
async function createTemplate(request, name) {
  return (await request.post('/api/catalog', { data: { name } })).json();
}
async function setRecipe(request, templateId, lines) {
  return request.put(`/api/catalog/${templateId}/recipe`, { data: { lines } });
}
async function createOrder(request, name) {
  return (await request.post('/api/orders', { data: { name } })).json();
}
async function addProduct(request, orderId, name, templateId, quantity) {
  return (await request.post('/api/products', { data: { orderId, name, templateId, quantity } })).json();
}

function materialRow(page, name) {
  return page.locator('.material-row', { has: page.locator('.material-row-name', { hasText: name }) });
}

test.describe('Feature 008 — Materials stock & recipes', () => {
  test.beforeEach(async ({ request }) => {
    await clearOrders(request);
    await clearCatalog(request);
    await clearMaterials(request);
  });

  test('US1: add a material via UI and it persists across reload', async ({ page }) => {
    await page.goto('/stoc-materiale');
    const addSection = page.locator('.materials-add-section');
    await addSection.getByLabel('Nume material').fill('Carton');
    await addSection.getByLabel('Stoc actual').fill('100');
    await addSection.getByLabel('Stoc minim').fill('20');
    await addSection.getByLabel('Unitate de măsură').fill('foi');
    await addSection.getByRole('button', { name: 'Adaugă' }).click();

    await expect(materialRow(page, 'Carton')).toBeVisible();
    await page.reload();
    await expect(materialRow(page, 'Carton')).toContainText('100');
  });

  test('US1: navbar link reaches the page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Stoc Materiale' }).click();
    await expect(page.locator('.materials-title')).toHaveText('Stoc Materiale');
  });

  test('US2: define a recipe and it reappears after reload', async ({ page, request }) => {
    await createMaterial(request, { name: 'Carton', currentStock: 100, minStock: 5, unit: 'foi' });
    await createMaterial(request, { name: 'Satin', currentStock: 50, minStock: 5, unit: 'm' });
    const { template } = await createTemplate(request, 'Invitație');

    await page.goto('/catalog');
    const item = page.locator('.catalog-item', { has: page.locator('.catalog-item-name', { hasText: 'Invitație' }) });
    await item.getByRole('button', { name: 'Rețetă' }).click();

    // Add first line: Carton @ 1
    await item.getByRole('button', { name: '+ Adaugă material' }).click();
    await item.locator('.recipe-line').nth(0).getByLabel('Consum per bucată').fill('1');
    // Add second line: select Satin @ 0.2
    await item.getByRole('button', { name: '+ Adaugă material' }).click();
    await item.locator('.recipe-line').nth(1).getByLabel('Material').selectOption({ label: 'Satin' });
    await item.locator('.recipe-line').nth(1).getByLabel('Consum per bucată').fill('0.2');
    await item.getByRole('button', { name: 'Salvează rețeta' }).click();
    await expect(item.getByText('Rețetă salvată.')).toBeVisible();

    // Reload, reopen → two lines persist
    await page.reload();
    const item2 = page.locator('.catalog-item', { has: page.locator('.catalog-item-name', { hasText: 'Invitație' }) });
    await item2.getByRole('button', { name: 'Rețetă' }).click();
    await expect(item2.locator('.recipe-line')).toHaveCount(2);
  });

  test('US3: low-stock alert appears strictly below minimum and clears at/above', async ({ page, request }) => {
    await createMaterial(request, { name: 'Carton', currentStock: 100, minStock: 20, unit: 'foi' });

    await page.goto('/stoc-materiale');
    await expect(page.locator('.materials-alert')).toHaveCount(0);

    // Edit current stock below minimum → alert appears.
    // (In edit mode the row's name span is replaced by the form, so scope the
    // edit form to the list rather than to the name-based row locator.)
    await materialRow(page, 'Carton').getByRole('button', { name: 'Editează' }).click();
    const editForm = page.locator('.materials-list .material-form');
    await editForm.getByLabel('Stoc actual').fill('10');
    await editForm.getByRole('button', { name: 'Salvează' }).click();
    await expect(page.locator('.materials-alert')).toContainText('Carton');

    // Raise to exactly the minimum → no alert (strict below only)
    await materialRow(page, 'Carton').getByRole('button', { name: 'Editează' }).click();
    const editForm2 = page.locator('.materials-list .material-form');
    await editForm2.getByLabel('Stoc actual').fill('20');
    await editForm2.getByRole('button', { name: 'Salvează' }).click();
    await expect(page.locator('.materials-alert')).toHaveCount(0);
  });

  test('US4: completing an order deducts stock once and is not restored on delete', async ({ page, request }) => {
    const { material } = await createMaterial(request, { name: 'Carton', currentStock: 100, minStock: 5, unit: 'foi' });
    const { template } = await createTemplate(request, 'Invitație');
    await setRecipe(request, template.id, [{ materialId: material.id, qtyPerPiece: 1 }]);

    const { order } = await createOrder(request, 'Comandă Consum');
    const { product } = await addProduct(request, order.id, 'Invitație', template.id, 30);

    // Complete the order: move the product to "gata" (triggers deduction)
    await request.patch(`/api/products/${product.id}`, { data: { status: 'gata' } });

    await page.goto('/stoc-materiale');
    await expect(materialRow(page, 'Carton')).toContainText('70'); // 100 - 30×1

    // Re-completing (idempotent): patch status again → still 70
    await request.patch(`/api/products/${product.id}`, { data: { status: 'gata' } });
    await page.reload();
    await expect(materialRow(page, 'Carton')).toContainText('70');

    // Delete the completed order → stock NOT restored (still 70)
    await request.delete(`/api/orders/${order.id}`);
    await page.reload();
    await expect(materialRow(page, 'Carton')).toContainText('70');
  });
});
