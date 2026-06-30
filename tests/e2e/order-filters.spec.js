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

function orderRow(page, name) {
  return page.getByTestId('order-row').filter({ hasText: name });
}

// Pick an option from a shadcn (Radix) Select identified by its trigger testid.
async function selectOption(page, triggerTestId, optionName) {
  await page.getByTestId(triggerTestId).click();
  await page.getByRole('option', { name: optionName, exact: true }).click();
}

// Seed a fixed set of orders with varied filterable fields.
async function seed(request) {
  await createOrder(request, 'Nuntă Maria', {
    client: 'Maria Ionescu',
    county: 'Cluj',
    contactPlatform: 'Facebook',
    collected: true,
    delivered: false,
  });
  await createOrder(request, 'Botez Ion', {
    client: 'Ion Popescu',
    county: 'București',
    contactPlatform: 'Instagram',
    collected: false,
    delivered: true,
  });
  await createOrder(request, 'Cununie Ana', {
    client: 'Ana Maria',
    county: 'Cluj',
    contactPlatform: 'Telefon',
    collected: true,
    delivered: true,
  });
}

test.describe('Feature 007 — Order filters', () => {
  test.beforeEach(async ({ request }) => {
    await clearOrders(request);
    await seed(request);
  });

  test('Scenario 1: client name search filters and clears', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('order-row')).toHaveCount(3);

    await page.fill('#filter-client', 'maria');
    // "Maria Ionescu" and "Ana Maria" match
    await expect(page.getByTestId('order-row')).toHaveCount(2);
    await expect(orderRow(page, 'Nuntă Maria')).toBeVisible();
    await expect(orderRow(page, 'Cununie Ana')).toBeVisible();

    // No match → empty state
    await page.fill('#filter-client', 'zzz');
    await expect(page.getByTestId('order-row')).toHaveCount(0);
    await expect(page.getByTestId('orders-empty')).toContainText('Nicio comandă găsită');

    // Clear → all restored
    await page.fill('#filter-client', '');
    await expect(page.getByTestId('order-row')).toHaveCount(3);
  });

  test('Scenario 2: county dropdown filters and resets', async ({ page }) => {
    await page.goto('/');
    await selectOption(page, 'filter-county', 'Cluj');
    await expect(page.getByTestId('order-row')).toHaveCount(2);
    await expect(orderRow(page, 'Botez Ion')).toHaveCount(0);

    await selectOption(page, 'filter-county', 'Toate județele');
    await expect(page.getByTestId('order-row')).toHaveCount(3);
  });

  test('Scenario 3: platform dropdown filters and resets', async ({ page }) => {
    await page.goto('/');
    await selectOption(page, 'filter-platform', 'Instagram');
    await expect(page.getByTestId('order-row')).toHaveCount(1);
    await expect(orderRow(page, 'Botez Ion')).toBeVisible();

    await selectOption(page, 'filter-platform', 'Toate platformele');
    await expect(page.getByTestId('order-row')).toHaveCount(3);
  });

  test('Scenario 4: collection status filter', async ({ page }) => {
    await page.goto('/');
    await selectOption(page, 'filter-collected', 'Încasată');
    await expect(page.getByTestId('order-row')).toHaveCount(2);

    await selectOption(page, 'filter-collected', 'Neîncasată');
    await expect(page.getByTestId('order-row')).toHaveCount(1);
    await expect(orderRow(page, 'Botez Ion')).toBeVisible();

    await selectOption(page, 'filter-collected', 'Toate');
    await expect(page.getByTestId('order-row')).toHaveCount(3);
  });

  test('Scenario 5: delivery status filter', async ({ page }) => {
    await page.goto('/');
    await selectOption(page, 'filter-delivered', 'Livrată');
    await expect(page.getByTestId('order-row')).toHaveCount(2);

    await selectOption(page, 'filter-delivered', 'Nelivrată');
    await expect(page.getByTestId('order-row')).toHaveCount(1);
    await expect(orderRow(page, 'Nuntă Maria')).toBeVisible();

    await selectOption(page, 'filter-delivered', 'Toate');
    await expect(page.getByTestId('order-row')).toHaveCount(3);
  });

  test('Scenario 6: combined multi-filter + reset button', async ({ page }) => {
    await page.goto('/');

    // Reset button hidden when no filters active
    await expect(page.getByTestId('filter-reset')).toHaveCount(0);

    await page.fill('#filter-client', 'maria');
    await selectOption(page, 'filter-county', 'Cluj');
    await selectOption(page, 'filter-collected', 'Încasată');
    await selectOption(page, 'filter-delivered', 'Livrată');
    // Only "Cununie Ana" (Ana Maria) matches all four
    await expect(page.getByTestId('order-row')).toHaveCount(1);
    await expect(orderRow(page, 'Cununie Ana')).toBeVisible();

    // Reset clears everything
    await page.getByTestId('filter-reset').click();
    await expect(page.getByTestId('order-row')).toHaveCount(3);
    await expect(page.locator('#filter-client')).toHaveValue('');
    await expect(page.getByTestId('filter-county')).toContainText('Toate');
    await expect(page.getByTestId('filter-reset')).toHaveCount(0);
  });
});
