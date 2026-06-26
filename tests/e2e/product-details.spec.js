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
      additionalInfo: opts.additionalInfo ?? 'Font Arial, culoare roșu',
    },
  });
  const { product } = await productRes.json();
  return { order, product };
}

function orderRow(page, name) {
  return page.locator('.order-row', { has: page.locator('.order-row-name', { hasText: name }) });
}

test.describe('product-details', () => {
  test.beforeEach(async ({ request }) => {
    await clearOrders(request);
  });

  test('quantity badge is visible on card without interaction', async ({ page, request }) => {
    await setupOrderWithProduct(request, { orderName: 'QtyBadge Order', quantity: 5 });
    await page.goto('/');
    await orderRow(page, 'QtyBadge Order').click();
    await expect(page.locator('.product-board')).toBeVisible();
    await expect(page.locator('.product-card-qty')).toContainText('×5');
  });

  test('long-press for 2+ seconds opens modal with additionalInfo', async ({ page, request }) => {
    await setupOrderWithProduct(request, {
      orderName: 'LongPress Order',
      additionalInfo: 'Detaliu test lung',
    });
    await page.goto('/');
    await orderRow(page, 'LongPress Order').click();
    await expect(page.locator('.product-board')).toBeVisible();

    const card = page.locator('.product-card').first();
    await card.waitFor({ state: 'visible' });
    const box = await card.boundingBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.waitForTimeout(2200);
    await page.mouse.up();

    await expect(page.locator('.product-modal-overlay--open')).toBeVisible({ timeout: 1000 });
    await expect(page.locator('.product-modal-body')).toContainText('Detaliu test lung');
  });

  test('releasing mouse before 2 seconds causes no modal', async ({ page, request }) => {
    await setupOrderWithProduct(request, {
      orderName: 'ShortPress Order',
      additionalInfo: 'Nu ar trebui sa apara',
    });
    await page.goto('/');
    await orderRow(page, 'ShortPress Order').click();
    await expect(page.locator('.product-board')).toBeVisible();

    const card = page.locator('.product-card').first();
    const box = await card.boundingBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.waitForTimeout(900);
    await page.mouse.up();

    await expect(page.locator('.product-modal-overlay--open')).not.toBeVisible({ timeout: 500 });
  });

  test('Tab to focus card then Enter opens modal immediately', async ({ page, request }) => {
    await setupOrderWithProduct(request, {
      orderName: 'Keyboard Enter Order',
      additionalInfo: 'Modal via tastatura Enter',
    });
    await page.goto('/');
    await orderRow(page, 'Keyboard Enter Order').click();
    await expect(page.locator('.product-board')).toBeVisible();

    const card = page.locator('.product-card').first();
    await card.focus();
    await page.keyboard.press('Enter');

    await expect(page.locator('.product-modal-overlay--open')).toBeVisible({ timeout: 1000 });
    await expect(page.locator('.product-modal-body')).toContainText('Modal via tastatura Enter');
  });

  test('Space on focused card opens modal immediately', async ({ page, request }) => {
    await setupOrderWithProduct(request, {
      orderName: 'Keyboard Space Order',
      additionalInfo: 'Modal via tastatura Space',
    });
    await page.goto('/');
    await orderRow(page, 'Keyboard Space Order').click();
    await expect(page.locator('.product-board')).toBeVisible();

    const card = page.locator('.product-card').first();
    await card.focus();
    await page.keyboard.press('Space');

    await expect(page.locator('.product-modal-overlay--open')).toBeVisible({ timeout: 1000 });
    await expect(page.locator('.product-modal-body')).toContainText('Modal via tastatura Space');
  });

  test('card with no additionalInfo shows no modal on long-press', async ({ page, request }) => {
    await setupOrderWithProduct(request, {
      orderName: 'NoInfo Order',
      additionalInfo: null,
    });
    await page.goto('/');
    await orderRow(page, 'NoInfo Order').click();
    await expect(page.locator('.product-board')).toBeVisible();

    const card = page.locator('.product-card').first();
    const box = await card.boundingBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.waitForTimeout(2200);
    await page.mouse.up();

    await expect(page.locator('.product-modal-overlay--open')).not.toBeVisible({ timeout: 500 });
  });

  test('modal closes on backdrop click', async ({ page, request }) => {
    await setupOrderWithProduct(request, {
      orderName: 'Backdrop Close Order',
      additionalInfo: 'Inchide pe backdrop',
    });
    await page.goto('/');
    await orderRow(page, 'Backdrop Close Order').click();
    await expect(page.locator('.product-board')).toBeVisible();

    const card = page.locator('.product-card').first();
    await card.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.product-modal-overlay--open')).toBeVisible({ timeout: 1000 });

    // Click on the overlay (not the content)
    await page.locator('.product-modal-overlay').click({ position: { x: 5, y: 5 } });
    await expect(page.locator('.product-modal-overlay--open')).not.toBeVisible({ timeout: 1000 });
  });

  test('modal closes on Escape key', async ({ page, request }) => {
    await setupOrderWithProduct(request, {
      orderName: 'Escape Close Order',
      additionalInfo: 'Inchide cu Escape',
    });
    await page.goto('/');
    await orderRow(page, 'Escape Close Order').click();
    await expect(page.locator('.product-board')).toBeVisible();

    const card = page.locator('.product-card').first();
    await card.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.product-modal-overlay--open')).toBeVisible({ timeout: 1000 });

    await page.keyboard.press('Escape');
    await expect(page.locator('.product-modal-overlay--open')).not.toBeVisible({ timeout: 1000 });
  });
});
