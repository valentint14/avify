const { test, expect } = require('@playwright/test');

async function clearOrders(request) {
  const res = await request.get('/api/orders');
  const { orders } = await res.json();
  await Promise.all(orders.map((o) => request.delete(`/api/orders/${o.id}`)));
}

async function createOrder(request, name, fields = {}) {
  const res = await request.post('/api/orders', { data: { name, ...fields } });
  return (await res.json()).order;
}

async function createProduct(request, orderId, name) {
  const res = await request.post('/api/products', { data: { orderId, name } });
  return (await res.json()).product;
}

function orderRow(page, name) {
  return page.getByTestId('order-row').filter({ hasText: name });
}

async function openEditModal(page, name) {
  const row = orderRow(page, name);
  await row.hover();
  await row.getByTestId('order-edit').click();
  await expect(page.getByTestId('edit-order-modal')).toBeVisible();
}

async function save(page) {
  await page.getByTestId('order-save').click();
  await expect(page.getByTestId('edit-order-modal')).toHaveCount(0);
}

function productLine(page, productName) {
  return page.getByTestId('product-line').filter({ hasText: productName });
}

// Scope a product's unit-price input by the product name shown in the modal
function priceInput(page, productName) {
  return productLine(page, productName).getByTestId('product-price');
}

test.describe('Feature 006 — Extended order fields & totals', () => {
  test.beforeEach(async ({ request }) => {
    await clearOrders(request);
  });

  test('Scenario 1: order fields persist across reload', async ({ page, request }) => {
    await createOrder(request, 'Nuntă Fields');

    await page.goto('/');
    await openEditModal(page, 'Nuntă Fields');

    await page.fill('#ord-client', 'Maria Ionescu');
    await page.fill('#ord-county', 'Cluj');
    await page.fill('#ord-advance', '500');
    await page.fill('#ord-profit', '150');
    await page.selectOption('#ord-platform', 'Facebook');
    await page.fill('#ord-reception', '2026-07-01');
    await page.fill('#ord-event', '2026-08-15');
    await page.getByTestId('order-check-collected').locator('input').check();
    await save(page);

    // Reload and reopen — values must be pre-populated
    await page.reload();
    await openEditModal(page, 'Nuntă Fields');

    await expect(page.locator('#ord-client')).toHaveValue('Maria Ionescu');
    await expect(page.locator('#ord-county')).toHaveValue('Cluj');
    await expect(page.locator('#ord-advance')).toHaveValue('500');
    await expect(page.locator('#ord-profit')).toHaveValue('150');
    await expect(page.locator('#ord-platform')).toHaveValue('Facebook');
    await expect(page.locator('#ord-reception')).toHaveValue('2026-07-01');
    await expect(page.locator('#ord-event')).toHaveValue('2026-08-15');
    await expect(
      page.getByTestId('order-check-collected').locator('input')
    ).toBeChecked();
  });

  test('Scenario 2: unit price × quantity produces correct row total', async ({ page, request }) => {
    const order = await createOrder(request, 'Total Order');
    await createProduct(request, order.id, 'Invitații');
    await createProduct(request, order.id, 'Meniuri');

    await page.goto('/');
    await openEditModal(page, 'Total Order');

    // Invitații: qty 3 × 50 ; Meniuri: qty 2 × 120  →  390
    await productLine(page, 'Invitații').getByTestId('product-qty').fill('3');
    await priceInput(page, 'Invitații').fill('50');
    await productLine(page, 'Meniuri').getByTestId('product-qty').fill('2');
    await priceInput(page, 'Meniuri').fill('120');

    // Live summary inside modal
    await expect(page.getByTestId('order-total-live')).toHaveText('390.00 RON');
    await save(page);

    // Row total visible without expanding
    await expect(orderRow(page, 'Total Order').getByTestId('order-total')).toContainText('390.00 RON');
  });

  test('Scenario 3: total updates when unit price changes', async ({ page, request }) => {
    const order = await createOrder(request, 'Recalc Order');
    await createProduct(request, order.id, 'Invitații');

    await page.goto('/');
    await openEditModal(page, 'Recalc Order');
    await productLine(page, 'Invitații').getByTestId('product-qty').fill('3');
    await priceInput(page, 'Invitații').fill('50');
    await save(page);
    await expect(orderRow(page, 'Recalc Order').getByTestId('order-total')).toContainText('150.00 RON');

    // Change price 50 → 100
    await openEditModal(page, 'Recalc Order');
    await priceInput(page, 'Invitații').fill('100');
    await expect(page.getByTestId('order-total-live')).toHaveText('300.00 RON');
    await save(page);
    await expect(orderRow(page, 'Recalc Order').getByTestId('order-total')).toContainText('300.00 RON');
  });

  test('Scenario 4: order with no products shows total 0', async ({ page, request }) => {
    await createOrder(request, 'Empty Order');
    await page.goto('/');
    await expect(orderRow(page, 'Empty Order').getByTestId('order-total')).toContainText('0.00 RON');
  });

  test('Scenario 5: custom contact platform via Altele', async ({ page, request }) => {
    await createOrder(request, 'Custom Platform');

    await page.goto('/');
    await openEditModal(page, 'Custom Platform');
    await page.selectOption('#ord-platform', 'Altele');
    await expect(page.locator('#ord-platform-custom')).toBeVisible();
    await page.fill('#ord-platform-custom', 'WhatsApp');
    await save(page);

    await page.reload();
    await openEditModal(page, 'Custom Platform');
    await expect(page.locator('#ord-platform')).toHaveValue('Altele');
    await expect(page.locator('#ord-platform-custom')).toHaveValue('WhatsApp');
  });

  test('Scenario 6: collected/delivered badges scannable in row', async ({ page, request }) => {
    await createOrder(request, 'Paid Delivered', { collected: true, delivered: true });
    await createOrder(request, 'Unpaid Undelivered', { collected: false, delivered: false });

    await page.goto('/');

    const paidRow = orderRow(page, 'Paid Delivered');
    await expect(paidRow.locator('[data-active="true"]')).toHaveCount(2);

    const unpaidRow = orderRow(page, 'Unpaid Undelivered');
    await expect(unpaidRow.locator('[data-active="true"]')).toHaveCount(0);
    await expect(unpaidRow.locator('[data-active="false"]')).toHaveCount(2);
  });
});
