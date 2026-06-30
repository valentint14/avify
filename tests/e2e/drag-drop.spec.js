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

test.describe('US3 — Drag-and-drop products', () => {
  test.beforeEach(async ({ request }) => {
    await clearOrders(request);
  });

  test('drag product to a different column — card moves and persists after reload', async ({ page, request }) => {
    const order = await createOrder(request, 'DnD Move Test');
    await createProduct(request, order.id, 'Produs Drag');

    await page.goto('/');
    await orderRow(page, 'DnD Move Test').click();

    const deFacutColumn = page.getByTestId('product-column').nth(0);
    const printareColumn = page.getByTestId('product-column').nth(3);

    await expect(deFacutColumn.getByTestId('product-card')).toHaveCount(1, { timeout: 5000 });

    await dragToColumn(page, '[data-testid="product-column"]:nth-child(1) [data-testid="product-card"]', '[data-testid="product-column"]:nth-child(4)');

    await expect(printareColumn.getByTestId('product-card')).toHaveCount(1, { timeout: 3000 });
    await expect(deFacutColumn.getByTestId('product-card')).toHaveCount(0);

    // Reload and verify persistence
    await page.reload();
    await orderRow(page, 'DnD Move Test').click();
    await expect(page.getByTestId('product-column').nth(3).getByTestId('product-card')).toHaveCount(1, { timeout: 5000 });
  });

  test('drop on same column does not move the card', async ({ page, request }) => {
    const order = await createOrder(request, 'DnD Same Column Test');
    await createProduct(request, order.id, 'Produs Same');

    await page.goto('/');
    await orderRow(page, 'DnD Same Column Test').click();

    const deFacutColumn = page.getByTestId('product-column').nth(0);
    await expect(deFacutColumn.getByTestId('product-card')).toHaveCount(1, { timeout: 5000 });

    await dragToColumn(page, '[data-testid="product-column"]:nth-child(1) [data-testid="product-card"]', '[data-testid="product-column"]:nth-child(1)');

    // Should still have 1 card (no move happened)
    await expect(deFacutColumn.getByTestId('product-card')).toHaveCount(1);
  });
});
