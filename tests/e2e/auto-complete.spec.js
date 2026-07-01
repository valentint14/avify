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

function orderRow(page, name) {
  return page.getByTestId('order-row').filter({ hasText: name });
}

function statusBadge(page, name, type) {
  return page.getByTestId('order-row').filter({ hasText: name })
    .locator(`[data-testid="order-status"][data-status="${type}"]`);
}

async function dragToColumn(page, sourceSelector, targetSelector) {
  await page.evaluate(({ src, tgt }) => {
    const source = document.querySelector(src);
    const target = document.querySelector(tgt);
    if (!source || !target) throw new Error(`Cannot find '${src}' or '${tgt}'`);
    const dt = new DataTransfer();
    source.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }));
    target.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer: dt }));
    target.dispatchEvent(new DragEvent('dragover',  { bubbles: true, cancelable: true, dataTransfer: dt }));
    target.dispatchEvent(new DragEvent('drop',      { bubbles: true, cancelable: true, dataTransfer: dt }));
    source.dispatchEvent(new DragEvent('dragend',   { bubbles: true, cancelable: true, dataTransfer: dt }));
  }, { src: sourceSelector, tgt: targetSelector });
}

test.describe('US4 — Auto-complete order', () => {
  test.beforeEach(async ({ request }) => {
    await clearOrders(request);
  });

  test('order becomes Finalizata when last product reaches Gata', async ({ page, request }) => {
    const order = await createOrder(request, 'Auto Finalizata Test');
    await createProduct(request, order.id, 'Produs A');

    await page.goto('/');
    await expect(statusBadge(page, 'Auto Finalizata Test', 'in_progres')).toBeVisible();

    await orderRow(page, 'Auto Finalizata Test').click();
    await expect(page.getByTestId('product-column').nth(0).getByTestId('product-card')).toHaveCount(1, { timeout: 5000 });

    await dragToColumn(page, '[data-testid="product-column"]:nth-child(1) [data-testid="product-card"]', '[data-testid="product-column"]:nth-child(3)');

    await expect(statusBadge(page, 'Auto Finalizata Test', 'finalizata')).toBeVisible({ timeout: 4000 });
    await expect(statusBadge(page, 'Auto Finalizata Test', 'in_progres')).not.toBeVisible();
  });

  test('order reverts to In progres when product moves out of Gata', async ({ page, request }) => {
    const order = await createOrder(request, 'Revert Test Order');
    const product = await createProduct(request, order.id, 'Produs B');

    // Pre-set product to realizat via API
    await request.patch(`/api/products/${product.id}`, { data: { status: 'realizat' } });

    await page.goto('/');
    await expect(statusBadge(page, 'Revert Test Order', 'finalizata')).toBeVisible();

    await orderRow(page, 'Revert Test Order').click();
    await expect(page.getByTestId('product-column').nth(2).getByTestId('product-card')).toHaveCount(1, { timeout: 5000 });

    await dragToColumn(page, '[data-testid="product-column"]:nth-child(3) [data-testid="product-card"]', '[data-testid="product-column"]:nth-child(1)');

    await expect(statusBadge(page, 'Revert Test Order', 'in_progres')).toBeVisible({ timeout: 4000 });
    await expect(statusBadge(page, 'Revert Test Order', 'finalizata')).not.toBeVisible();
  });

  test('order only completes when ALL products are in Gata', async ({ page, request }) => {
    const order = await createOrder(request, 'Multi Gata Test');
    await createProduct(request, order.id, 'Produs C');
    await createProduct(request, order.id, 'Produs D');

    await page.goto('/');
    await orderRow(page, 'Multi Gata Test').click();
    await expect(page.getByTestId('product-column').nth(0).getByTestId('product-card')).toHaveCount(2, { timeout: 5000 });

    // Move first product to Realizat
    await dragToColumn(page, '[data-testid="product-column"]:nth-child(1) [data-testid="product-card"]', '[data-testid="product-column"]:nth-child(3)');
    await page.waitForTimeout(500);

    // Still in_progres
    await expect(statusBadge(page, 'Multi Gata Test', 'in_progres')).toBeVisible();

    // Move second product to Realizat
    await dragToColumn(page, '[data-testid="product-column"]:nth-child(1) [data-testid="product-card"]', '[data-testid="product-column"]:nth-child(3)');

    await expect(statusBadge(page, 'Multi Gata Test', 'finalizata')).toBeVisible({ timeout: 4000 });
  });
});
