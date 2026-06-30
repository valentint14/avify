const { test, expect } = require('@playwright/test');

async function clearOrders(request) {
  const res = await request.get('/api/orders');
  const { orders } = await res.json();
  await Promise.all(orders.map((o) => request.delete(`/api/orders/${o.id}`)));
}

async function setupOrderWithProduct(request, opts = {}) {
  const orderRes = await request.post('/api/orders', { data: { name: opts.orderName ?? 'Details Test Order' } });
  const { order } = await orderRes.json();
  const productRes = await request.post('/api/products', {
    data: {
      orderId: order.id,
      name: opts.productName ?? 'Tricou',
      quantity: opts.quantity ?? 3,
      // Respect an explicit null (no info); only default when omitted.
      additionalInfo: 'additionalInfo' in opts ? opts.additionalInfo : 'Font Arial, culoare roșu',
    },
  });
  const { product } = await productRes.json();
  return { order, product };
}

function orderRow(page, name) {
  return page.getByTestId('order-row').filter({ hasText: name });
}

async function openBoard(page, request, opts) {
  const ctx = await setupOrderWithProduct(request, opts);
  await page.goto('/');
  await orderRow(page, opts.orderName).click();
  await expect(page.getByTestId('product-board')).toBeVisible();
  return ctx;
}

test.describe('product-details', () => {
  test.beforeEach(async ({ request }) => {
    await clearOrders(request);
  });

  test('quantity badge is visible on card without interaction', async ({ page, request }) => {
    await openBoard(page, request, { orderName: 'QtyBadge Order', quantity: 5 });
    await expect(page.getByTestId('product-qty-badge')).toContainText('×5');
  });

  test('clicking a card with details opens the modal with additionalInfo', async ({ page, request }) => {
    await openBoard(page, request, { orderName: 'Click Open Order', additionalInfo: 'Detaliu test lung' });

    await page.getByTestId('product-card').first().click();
    await expect(page.getByTestId('product-details-modal')).toBeVisible({ timeout: 1000 });
    await expect(page.getByTestId('product-details-body')).toContainText('Detaliu test lung');
  });

  test('Enter on a focused card opens the modal', async ({ page, request }) => {
    await openBoard(page, request, { orderName: 'Keyboard Enter Order', additionalInfo: 'Modal via tastatura Enter' });

    await page.getByTestId('product-card').first().focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('product-details-modal')).toBeVisible({ timeout: 1000 });
    await expect(page.getByTestId('product-details-body')).toContainText('Modal via tastatura Enter');
  });

  test('Space on a focused card opens the modal', async ({ page, request }) => {
    await openBoard(page, request, { orderName: 'Keyboard Space Order', additionalInfo: 'Modal via tastatura Space' });

    await page.getByTestId('product-card').first().focus();
    await page.keyboard.press('Space');
    await expect(page.getByTestId('product-details-modal')).toBeVisible({ timeout: 1000 });
    await expect(page.getByTestId('product-details-body')).toContainText('Modal via tastatura Space');
  });

  test('card with no additionalInfo does not open a modal on click', async ({ page, request }) => {
    await openBoard(page, request, { orderName: 'NoInfo Order', additionalInfo: null });

    await page.getByTestId('product-card').first().click();
    await expect(page.getByTestId('product-details-modal')).toHaveCount(0);
  });

  test('modal closes on Escape', async ({ page, request }) => {
    await openBoard(page, request, { orderName: 'Escape Close Order', additionalInfo: 'Închide cu Escape' });

    await page.getByTestId('product-card').first().click();
    await expect(page.getByTestId('product-details-modal')).toBeVisible({ timeout: 1000 });

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('product-details-modal')).toHaveCount(0, { timeout: 1000 });
  });

  test('modal closes on overlay click', async ({ page, request }) => {
    await openBoard(page, request, { orderName: 'Backdrop Close Order', additionalInfo: 'Închide pe backdrop' });

    await page.getByTestId('product-card').first().click();
    await expect(page.getByTestId('product-details-modal')).toBeVisible({ timeout: 1000 });

    await page.locator('[data-slot="dialog-overlay"]').click({ position: { x: 5, y: 5 } });
    await expect(page.getByTestId('product-details-modal')).toHaveCount(0, { timeout: 1000 });
  });
});
