const { test, expect } = require('@playwright/test');

async function clearOrders(request) {
  const res = await request.get('/api/orders');
  const { orders } = await res.json();
  await Promise.all(orders.map((o) => request.delete(`/api/orders/${o.id}`)));
}

function orderRow(page, name) {
  return page.getByTestId('order-row').filter({ hasText: name });
}

// Add a product via the board's "Scrie manual" mode (catalog mode is default
// and requires a catalog selection).
async function addManualProduct(page, name) {
  await page.getByRole('button', { name: 'Scrie manual' }).click();
  await page.getByTestId('add-product-input').fill(name);
  await page.getByTestId('add-product-submit').click();
}

test.describe('US5 — Add orders and products', () => {
  test.beforeEach(async ({ request }) => {
    await clearOrders(request);
  });

  test('add a new order — appears in list with In progres badge', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('add-order-input').fill('Botez Ion Add Test');
    await page.getByTestId('add-order-submit').click();

    const row = orderRow(page, 'Botez Ion Add Test');
    await expect(row).toBeVisible({ timeout: 3000 });
    await expect(row.getByTestId('order-status')).toHaveText('În progres');
  });

  test('new order persists after page reload', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('add-order-input').fill('Persist Reload Test');
    await page.getByTestId('add-order-submit').click();
    await expect(orderRow(page, 'Persist Reload Test')).toBeVisible();

    await page.reload();
    await expect(orderRow(page, 'Persist Reload Test')).toBeVisible();
  });

  test('submitting empty order name shows validation error', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('add-order-submit').click();
    await expect(page.getByTestId('add-order-error')).toBeVisible();
  });

  test('add a product to an expanded order — appears in De facut', async ({ page, request }) => {
    await request.post('/api/orders', { data: { name: 'Add Product Test Order' } });
    await page.goto('/');
    await orderRow(page, 'Add Product Test Order').click();

    await expect(page.getByTestId('product-board')).toBeVisible();

    await addManualProduct(page, 'Invitatie');

    const deFacutColumn = page.getByTestId('product-column').first();
    await expect(deFacutColumn.getByTestId('product-card')).toHaveCount(1, { timeout: 3000 });
  });

  test('submitting empty product name shows validation error', async ({ page, request }) => {
    await request.post('/api/orders', { data: { name: 'Validation Product Order' } });
    await page.goto('/');
    await orderRow(page, 'Validation Product Order').click();
    await expect(page.getByTestId('product-board')).toBeVisible();

    // Switch to manual mode then submit empty
    await page.getByRole('button', { name: 'Scrie manual' }).click();
    await page.getByTestId('add-product-submit').click();
    await expect(page.getByTestId('add-product-error')).toBeVisible();
  });

  test('product summary updates after adding a product', async ({ page, request }) => {
    await request.post('/api/orders', { data: { name: 'Summary Update Test' } });
    await page.goto('/');

    const row = orderRow(page, 'Summary Update Test');
    await expect(row.getByTestId('product-summary')).toContainText('0');

    await row.click();
    await expect(page.getByTestId('product-board')).toBeVisible();

    await addManualProduct(page, 'Produs');

    await expect(row.getByTestId('product-summary')).toContainText('1', { timeout: 3000 });
  });

  test('delete an order from the edit modal removes it from the list', async ({ page, request }) => {
    await request.post('/api/orders', { data: { name: 'Delete Me Order' } });
    await page.goto('/');
    const row = orderRow(page, 'Delete Me Order');
    await expect(row).toBeVisible();

    // Delete lives inside the edit modal, with a two-step confirm
    await row.hover();
    await row.getByTestId('order-edit').click();
    await expect(page.getByTestId('edit-order-modal')).toBeVisible();

    await page.getByTestId('order-delete').click();
    await page.getByTestId('order-delete-confirm').click();

    await expect(page.getByTestId('edit-order-modal')).toHaveCount(0);
    await expect(row).not.toBeVisible({ timeout: 3000 });
  });
});
