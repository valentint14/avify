const { test, expect } = require('@playwright/test');

async function clearOrders(request) {
  const res = await request.get('/api/orders');
  const { orders } = await res.json();
  await Promise.all(orders.map((o) => request.delete(`/api/orders/${o.id}`)));
}

async function createOrder(request, name) {
  const res = await request.post('/api/orders', { data: { name } });
  return (await res.json()).order;
}

async function createProduct(request, orderId, name) {
  const res = await request.post('/api/products', { data: { orderId, name } });
  return (await res.json()).product;
}

// Select the order row by its name text
function orderRow(page, name) {
  return page.locator('.order-row', { has: page.locator('.order-row-name', { hasText: name }) });
}

test.describe('US2 — Expand order / mini-board', () => {
  test.beforeEach(async ({ request }) => {
    await clearOrders(request);
  });

  test('clicking an order row expands it to show 6 columns', async ({ page, request }) => {
    const order = await createOrder(request, 'Nunta Expand Test');
    await createProduct(request, order.id, 'P1');

    await page.goto('/');
    const row = orderRow(page, 'Nunta Expand Test');
    await expect(row).toBeVisible();
    await row.click();

    const board = page.locator('.product-board');
    await expect(board).toBeVisible();

    const columns = page.locator('.product-column');
    await expect(columns).toHaveCount(6);

    const labels = await columns.locator('.product-column-label').allTextContents();
    expect(labels).toEqual([
      'De făcut', 'În Design', 'Validare Client', 'Printare', 'Asamblare', 'Gata',
    ]);
  });

  test('products appear in De facut column after creation', async ({ page, request }) => {
    const order = await createOrder(request, 'Nunta Products Test');
    await createProduct(request, order.id, 'Invitatii');
    await createProduct(request, order.id, 'Meniu');

    await page.goto('/');
    await orderRow(page, 'Nunta Products Test').click();

    const deFacutColumn = page.locator('.product-column').first();
    await expect(deFacutColumn.locator('.product-card')).toHaveCount(2, { timeout: 5000 });
  });

  test('clicking the same row collapses the board', async ({ page, request }) => {
    await createOrder(request, 'Nunta Collapse Test');

    await page.goto('/');
    const row = orderRow(page, 'Nunta Collapse Test');
    await row.click();
    await expect(page.locator('.product-board')).toBeVisible();

    await row.click();
    await expect(page.locator('.product-board')).not.toBeVisible();
  });

  test('accordion: only one order expanded at a time', async ({ page, request }) => {
    await createOrder(request, 'Nunta Accordion Test');
    await createOrder(request, 'Botez Accordion Test');

    await page.goto('/');
    await orderRow(page, 'Nunta Accordion Test').click();
    await expect(page.locator('.product-board')).toHaveCount(1);

    await orderRow(page, 'Botez Accordion Test').click();
    await expect(page.locator('.product-board')).toHaveCount(1);
    await expect(page.locator('.order-row--expanded')).toHaveCount(1);
  });

  test('empty board shows empty state message in each column', async ({ page, request }) => {
    await createOrder(request, 'Empty Board Test');

    await page.goto('/');
    await orderRow(page, 'Empty Board Test').click();

    const emptyMessages = page.locator('.product-column-empty');
    await expect(emptyMessages).toHaveCount(6);
  });
});
