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

async function createTemplate(request, name) {
  const res = await request.post('/api/catalog', { data: { name } });
  return (await res.json()).template;
}

function orderRow(page, name) {
  return page.getByTestId('order-row').filter({ hasText: name });
}

// Open an order's board and the product search combobox.
async function openProductSearch(page, orderName) {
  await orderRow(page, orderName).click();
  await expect(page.getByTestId('product-board')).toBeVisible();
  await page.getByTestId('product-search').click();
}

test.describe('US2 — Catalog selection via the product combobox', () => {
  test.beforeEach(async ({ request }) => {
    await clearOrders(request);
    await clearCatalog(request);
  });

  test('catalog products appear in the search results', async ({ page, request }) => {
    await createTemplate(request, 'Invitație clasică');
    await createTemplate(request, 'Meniu nuntă');
    await request.post('/api/orders', { data: { name: 'Catalog Visible Order' } });

    await page.goto('/');
    await openProductSearch(page, 'Catalog Visible Order');

    await expect(page.getByTestId('catalog-option').filter({ hasText: 'Invitație clasică' })).toBeVisible();
    await expect(page.getByTestId('catalog-option').filter({ hasText: 'Meniu nuntă' })).toBeVisible();
  });

  test('typing filters the catalog options', async ({ page, request }) => {
    await createTemplate(request, 'Invitație clasică');
    await createTemplate(request, 'Meniu nuntă');
    await request.post('/api/orders', { data: { name: 'Filter Order' } });

    await page.goto('/');
    await openProductSearch(page, 'Filter Order');
    await page.getByTestId('product-search').fill('meniu');

    await expect(page.getByTestId('catalog-option').filter({ hasText: 'Meniu nuntă' })).toBeVisible();
    await expect(page.getByTestId('catalog-option').filter({ hasText: 'Invitație clasică' })).toHaveCount(0);
  });

  test('selecting a catalog product adds it as an item', async ({ page, request }) => {
    await createTemplate(request, 'Meniu nuntă');
    await request.post('/api/orders', { data: { name: 'Select Order' } });

    await page.goto('/');
    await openProductSearch(page, 'Select Order');
    await page.getByTestId('catalog-option').filter({ hasText: 'Meniu nuntă' }).click();

    await expect(page.getByTestId('add-product-item').filter({ hasText: 'Meniu nuntă' })).toBeVisible();
  });

  test('add catalog products — they appear in the mini-board', async ({ page, request }) => {
    await createTemplate(request, 'Invitație clasică');
    await createTemplate(request, 'Meniu nuntă');
    await request.post('/api/orders', { data: { name: 'Board Catalog Order' } });

    await page.goto('/');
    await openProductSearch(page, 'Board Catalog Order');
    await page.getByTestId('catalog-option').filter({ hasText: 'Invitație clasică' }).click();
    await page.getByTestId('product-search').click();
    await page.getByTestId('catalog-option').filter({ hasText: 'Meniu nuntă' }).click();
    await page.getByTestId('add-product-submit').click();

    const deFacut = page.getByTestId('product-column').first();
    await expect(deFacut.getByTestId('product-card')).toHaveCount(2, { timeout: 3000 });
  });

  test('empty catalog shows guidance to add a product', async ({ page, request }) => {
    await request.post('/api/orders', { data: { name: 'Empty Catalog Order' } });
    await page.goto('/');
    await openProductSearch(page, 'Empty Catalog Order');

    await expect(page.getByText('Scrie un nume pentru a adăuga un produs.')).toBeVisible({ timeout: 2000 });
  });

  test('remove a selected item before submitting', async ({ page, request }) => {
    await createTemplate(request, 'Place card');
    await request.post('/api/orders', { data: { name: 'Remove Item Order' } });

    await page.goto('/');
    await openProductSearch(page, 'Remove Item Order');
    await page.getByTestId('catalog-option').filter({ hasText: 'Place card' }).click();

    const item = page.getByTestId('add-product-item').filter({ hasText: 'Place card' });
    await expect(item).toBeVisible();
    await item.getByRole('button', { name: /Elimină/ }).click();
    await expect(page.getByTestId('add-product-item')).toHaveCount(0);
  });
});
