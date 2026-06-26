const { test, expect } = require('@playwright/test');

async function clearOrders(request) {
  const res = await request.get('/api/orders');
  const { orders } = await res.json();
  await Promise.all(orders.map((o) => request.delete(`/api/orders/${o.id}`)));
}

function orderRow(page, name) {
  return page.locator('.order-row', { has: page.locator('.order-row-name', { hasText: name }) });
}

test.describe('US5 — Add orders and products', () => {
  test.beforeEach(async ({ request }) => {
    await clearOrders(request);
  });

  test('add a new order — appears in list with In progres badge', async ({ page }) => {
    await page.goto('/');
    await page.locator('.add-form-input').first().fill('Botez Ion Add Test');
    await page.locator('.add-form-btn').first().click();

    const row = orderRow(page, 'Botez Ion Add Test');
    await expect(row).toBeVisible({ timeout: 3000 });
    await expect(row.locator('.status-badge--in_progres')).toBeVisible();
  });

  test('new order persists after page reload', async ({ page }) => {
    await page.goto('/');
    await page.locator('.add-form-input').first().fill('Persist Reload Test');
    await page.locator('.add-form-btn').first().click();
    await expect(orderRow(page, 'Persist Reload Test')).toBeVisible();

    await page.reload();
    await expect(orderRow(page, 'Persist Reload Test')).toBeVisible();
  });

  test('submitting empty order name shows validation error', async ({ page }) => {
    await page.goto('/');
    await page.locator('.add-form-btn').first().click();
    await expect(page.locator('.add-form-error').first()).toBeVisible();
  });

  test('add a product to an expanded order — appears in De facut', async ({ page, request }) => {
    await request.post('/api/orders', { data: { name: 'Add Product Test Order' } });
    await page.goto('/');
    await orderRow(page, 'Add Product Test Order').click();

    await expect(page.locator('.product-board')).toBeVisible();

    await page.locator('.add-product-form .add-form-input').fill('Invitatie');
    await page.locator('.add-product-form .add-form-btn').click();

    const deFacutColumn = page.locator('.product-column').first();
    await expect(deFacutColumn.locator('.product-card')).toHaveCount(1, { timeout: 3000 });
  });

  test('submitting empty product name shows validation error', async ({ page, request }) => {
    await request.post('/api/orders', { data: { name: 'Validation Product Order' } });
    await page.goto('/');
    await orderRow(page, 'Validation Product Order').click();
    await expect(page.locator('.product-board')).toBeVisible();

    await page.locator('.add-product-form .add-form-btn').click();
    await expect(page.locator('.add-product-form .add-form-error')).toBeVisible();
  });

  test('product summary updates after adding a product', async ({ page, request }) => {
    await request.post('/api/orders', { data: { name: 'Summary Update Test' } });
    await page.goto('/');

    const row = orderRow(page, 'Summary Update Test');
    await expect(row.locator('.product-summary')).toContainText('0');

    await row.click();
    await expect(page.locator('.product-board')).toBeVisible();

    await page.locator('.add-product-form .add-form-input').fill('Produs');
    await page.locator('.add-product-form .add-form-btn').click();

    await expect(row.locator('.product-summary')).toContainText('1', { timeout: 3000 });
  });

  test('delete an order removes it from the list', async ({ page, request }) => {
    await request.post('/api/orders', { data: { name: 'Delete Me Order' } });
    await page.goto('/');
    const row = orderRow(page, 'Delete Me Order');
    await expect(row).toBeVisible();

    page.on('dialog', (dialog) => dialog.accept());
    await row.locator('.order-row-delete').click();
    await expect(row).not.toBeVisible({ timeout: 3000 });
  });
});
