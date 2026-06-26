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

function orderRow(page, name) {
  return page.locator('.order-row', { has: page.locator('.order-row-name', { hasText: name }) });
}

test.describe('US4 — Ad-hoc manual product entry', () => {
  test.beforeEach(async ({ request }) => {
    await clearOrders(request);
    await clearCatalog(request);
  });

  test('manual mode is default in AddProductForm', async ({ page, request }) => {
    await request.post('/api/orders', { data: { name: 'Manual Mode Test' } });
    await page.goto('/');
    await orderRow(page, 'Manual Mode Test').click();

    await expect(page.locator('.product-board')).toBeVisible();
    await expect(page.locator('.mode-toggle-btn--active', { hasText: 'Scrie manual' })).toBeVisible();
    await expect(page.locator('.add-product-form .add-form-input')).toBeVisible();
  });

  test('ad-hoc product added manually — visible in mini-board', async ({ page, request }) => {
    await request.post('/api/orders', { data: { name: 'Adhoc Order' } });
    await page.goto('/');
    await orderRow(page, 'Adhoc Order').click();

    await expect(page.locator('.product-board')).toBeVisible();
    await page.locator('.add-product-form .add-form-input').fill('Produs unicat special');
    await page.locator('.add-product-form .add-form-btn').click();

    const deFacutColumn = page.locator('.product-column').first();
    await expect(deFacutColumn.locator('.product-card', { hasText: 'Produs unicat special' })).toBeVisible({ timeout: 3000 });
  });

  test('ad-hoc product does NOT appear in catalog', async ({ page, request }) => {
    await request.post('/api/orders', { data: { name: 'Adhoc Catalog Check' } });
    await page.goto('/');
    await orderRow(page, 'Adhoc Catalog Check').click();

    await page.locator('.add-product-form .add-form-input').fill('Produs unicat');
    await page.locator('.add-product-form .add-form-btn').click();

    await page.goto('/catalog');
    await expect(page.locator('.catalog-item-name', { hasText: 'Produs unicat' })).not.toBeVisible();
  });

  test('catalog delete does not break existing order products', async ({ page, request }) => {
    const templateRes = await request.post('/api/catalog', { data: { name: 'Place card Delete Test' } });
    const { template } = await templateRes.json();

    await request.post('/api/orders', {
      data: { name: 'Order With Catalog Product', templateIds: [template.id] },
    });

    await request.delete(`/api/catalog/${template.id}`);

    await page.goto('/');
    await orderRow(page, 'Order With Catalog Product').click();

    await expect(page.locator('.product-board')).toBeVisible();
    const deFacutColumn = page.locator('.product-column').first();
    await expect(deFacutColumn.locator('.product-card', { hasText: 'Place card Delete Test' })).toBeVisible({ timeout: 3000 });
  });

  test('validation error shown when submitting empty manual product name', async ({ page, request }) => {
    await request.post('/api/orders', { data: { name: 'Validation Order' } });
    await page.goto('/');
    await orderRow(page, 'Validation Order').click();

    await expect(page.locator('.product-board')).toBeVisible();
    await page.locator('.add-product-form .add-form-btn').click();
    await expect(page.locator('.add-product-form .add-form-error')).toBeVisible({ timeout: 2000 });
  });
});
