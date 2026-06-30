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
  return page.getByTestId('order-row').filter({ hasText: name });
}

function productCard(page, name) {
  return page.getByTestId('product-card').filter({ hasText: name });
}

// Add an ad-hoc (non-catalog) product via the unified combobox.
async function addAdhoc(page, name) {
  await page.getByTestId('product-search').fill(name);
  await page.getByTestId('add-adhoc-option').click();
  await page.getByTestId('add-product-submit').click();
}

test.describe('US4 — Ad-hoc manual product entry', () => {
  test.beforeEach(async ({ request }) => {
    await clearOrders(request);
    await clearCatalog(request);
  });

  test('unified product search is available in the board', async ({ page, request }) => {
    await request.post('/api/orders', { data: { name: 'Search Available Test' } });
    await page.goto('/');
    await orderRow(page, 'Search Available Test').click();

    await expect(page.getByTestId('product-board')).toBeVisible();
    await expect(page.getByTestId('product-search')).toBeVisible();
  });

  test('ad-hoc product added — visible in mini-board', async ({ page, request }) => {
    await request.post('/api/orders', { data: { name: 'Adhoc Order' } });
    await page.goto('/');
    await orderRow(page, 'Adhoc Order').click();

    await expect(page.getByTestId('product-board')).toBeVisible();
    await addAdhoc(page, 'Produs unicat special');

    const deFacutColumn = page.getByTestId('product-column').first();
    await expect(deFacutColumn.getByTestId('product-card').filter({ hasText: 'Produs unicat special' })).toBeVisible({ timeout: 3000 });
  });

  test('ad-hoc product does NOT appear in catalog', async ({ page, request }) => {
    await request.post('/api/orders', { data: { name: 'Adhoc Catalog Check' } });
    await page.goto('/');
    await orderRow(page, 'Adhoc Catalog Check').click();

    await addAdhoc(page, 'Produs unicat');
    await expect(productCard(page, 'Produs unicat')).toBeVisible({ timeout: 3000 });

    await page.goto('/catalog');
    await expect(page.getByTestId('catalog-item').filter({ hasText: 'Produs unicat' })).toHaveCount(0);
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

    await expect(page.getByTestId('product-board')).toBeVisible();
    const deFacutColumn = page.getByTestId('product-column').first();
    await expect(deFacutColumn.getByTestId('product-card').filter({ hasText: 'Place card Delete Test' })).toBeVisible({ timeout: 3000 });
  });

  test('validation error shown when submitting with no product selected', async ({ page, request }) => {
    await request.post('/api/orders', { data: { name: 'Validation Order' } });
    await page.goto('/');
    await orderRow(page, 'Validation Order').click();

    await expect(page.getByTestId('product-board')).toBeVisible();
    await page.getByTestId('add-product-submit').click();
    await expect(page.getByTestId('add-product-error')).toBeVisible({ timeout: 2000 });
  });
});
