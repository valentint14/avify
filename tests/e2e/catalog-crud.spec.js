const { test, expect } = require('@playwright/test');

async function clearCatalog(request) {
  const res = await request.get('/api/catalog');
  const { templates } = await res.json();
  await Promise.all(templates.map((t) => request.delete(`/api/catalog/${t.id}`)));
}

async function clearOrders(request) {
  const res = await request.get('/api/orders');
  const { orders } = await res.json();
  await Promise.all(orders.map((o) => request.delete(`/api/orders/${o.id}`)));
}

test.describe('US1 — Catalog Produse CRUD', () => {
  test.beforeEach(async ({ request }) => {
    await clearCatalog(request);
    await clearOrders(request);
  });

  test('empty state message shown when catalog is empty', async ({ page }) => {
    await page.goto('/catalog');
    await expect(page.locator('.catalog-empty')).toBeVisible();
    await expect(page.locator('.catalog-empty-title')).toContainText('Catalogul este gol');
  });

  test('add a product — appears in list', async ({ page }) => {
    await page.goto('/catalog');
    await page.locator('.catalog-form-input').fill('Invitație clasică');
    await page.locator('button[type="submit"]').first().click();

    await expect(page.locator('.catalog-item-name', { hasText: 'Invitație clasică' })).toBeVisible({ timeout: 3000 });
    await expect(page.locator('.catalog-empty')).not.toBeVisible();
  });

  test('add product with description — description shown in list', async ({ page }) => {
    await page.goto('/catalog');
    await page.locator('.catalog-form-input').fill('Meniu nuntă');
    await page.locator('.catalog-form-desc').fill('Meniu tipărit A5');
    await page.locator('button[type="submit"]').first().click();

    await expect(page.locator('.catalog-item-name', { hasText: 'Meniu nuntă' })).toBeVisible({ timeout: 3000 });
    await expect(page.locator('.catalog-item-desc', { hasText: 'Meniu tipărit A5' })).toBeVisible();
  });

  test('submit with empty name shows error — product not added', async ({ page }) => {
    await page.goto('/catalog');
    await page.locator('button[type="submit"]').first().click();
    await expect(page.locator('.catalog-form-error').first()).toBeVisible({ timeout: 2000 });
    await expect(page.locator('.catalog-item')).toHaveCount(0);
  });

  test('edit a product — updated name shown', async ({ page, request }) => {
    await request.post('/api/catalog', { data: { name: 'Meniu nuntă' } });
    await page.goto('/catalog');

    await expect(page.locator('.catalog-item-name', { hasText: 'Meniu nuntă' })).toBeVisible();
    await page.locator('.catalog-item-btn', { hasText: 'Editează' }).first().click();

    const nameInput = page.locator('.catalog-item--editing .catalog-form-input');
    await nameInput.clear();
    await nameInput.fill('Meniu de nuntă elegantă');
    await page.locator('.catalog-item--editing button[type="submit"]').click();

    await expect(page.locator('.catalog-item-name', { hasText: 'Meniu de nuntă elegantă' })).toBeVisible({ timeout: 3000 });
    await expect(page.locator('.catalog-item-name', { hasText: 'Meniu nuntă' })).not.toBeVisible();
  });

  test('cancel edit — original name unchanged', async ({ page, request }) => {
    await request.post('/api/catalog', { data: { name: 'Place card' } });
    await page.goto('/catalog');

    await page.locator('.catalog-item-btn', { hasText: 'Editează' }).first().click();
    await page.locator('.catalog-item--editing .catalog-form-input').fill('Modified');
    await page.locator('.catalog-item--editing button', { hasText: 'Anulează' }).click();

    await expect(page.locator('.catalog-item-name', { hasText: 'Place card' })).toBeVisible();
    await expect(page.locator('.catalog-item--editing')).not.toBeVisible();
  });

  test('delete a product with inline confirm — product removed from list', async ({ page, request }) => {
    await request.post('/api/catalog', { data: { name: 'Mărturie' } });
    await request.post('/api/catalog', { data: { name: 'Program' } });
    await page.goto('/catalog');

    await expect(page.locator('.catalog-item')).toHaveCount(2);

    const marturieItem = page.locator('.catalog-item', {
      has: page.locator('.catalog-item-name', { hasText: 'Mărturie' }),
    });
    await marturieItem.locator('.catalog-item-btn--danger', { hasText: 'Șterge' }).click();
    await expect(marturieItem.locator('.catalog-delete-confirm')).toBeVisible();

    await marturieItem.locator('.catalog-item-btn--danger', { hasText: 'Confirmă' }).click();
    await expect(marturieItem).not.toBeVisible({ timeout: 3000 });
    await expect(page.locator('.catalog-item')).toHaveCount(1);
  });

  test('delete confirm — cancel keeps product in list', async ({ page, request }) => {
    await request.post('/api/catalog', { data: { name: 'Inel' } });
    await page.goto('/catalog');

    await page.locator('.catalog-item-btn--danger', { hasText: 'Șterge' }).first().click();
    await expect(page.locator('.catalog-delete-confirm')).toBeVisible();

    await page.locator('.catalog-delete-confirm button', { hasText: 'Anulează' }).click();
    await expect(page.locator('.catalog-item-name', { hasText: 'Inel' })).toBeVisible();
    await expect(page.locator('.catalog-delete-confirm')).not.toBeVisible();
  });

  test('products persist after page reload', async ({ page, request }) => {
    await request.post('/api/catalog', { data: { name: 'Invitație clasică' } });
    await page.goto('/catalog');
    await expect(page.locator('.catalog-item-name', { hasText: 'Invitație clasică' })).toBeVisible();

    await page.reload();
    await expect(page.locator('.catalog-item-name', { hasText: 'Invitație clasică' })).toBeVisible({ timeout: 3000 });
  });
});
