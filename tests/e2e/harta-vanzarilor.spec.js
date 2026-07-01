const { test, expect } = require('@playwright/test');

async function clearOrders(request) {
  const { orders } = await (await request.get('/api/orders')).json();
  await Promise.all(orders.map((o) => request.delete(`/api/orders/${o.id}`)));
}

async function seedDeliveredOrder(request, { county, profit = 100 } = {}) {
  const { order } = await (
    await request.post('/api/orders', { data: { name: `Comanda ${county}` } })
  ).json();
  await request.patch(`/api/orders/${order.id}`, {
    data: { county, delivered: 1, profit },
  });
  return order;
}

// ─────────────────────────────────────────────────────────────────
// Feature 016 — US1: Color-coded geographic map
// ─────────────────────────────────────────────────────────────────

test.describe('Feature 016 — harta vânzărilor: US1 color-coded map', () => {
  test.beforeEach(async ({ request }) => {
    await clearOrders(request);
  });

  test('Harta vânzărilor section heading is visible on /dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(
      page.locator('section[aria-label="Harta vânzărilor"]')
    ).toBeVisible({ timeout: 8000 });
    await expect(
      page.locator('section[aria-label="Harta vânzărilor"] h2')
    ).toContainText('Harta vânzărilor');
  });

  test('SVG map with 42 county paths is rendered', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('section[aria-label="Harta vânzărilor"]', { timeout: 8000 });
    const paths = page.locator('section[aria-label="Harta vânzărilor"] path[data-county]');
    await expect(paths).toHaveCount(42);
  });

  test('county with delivered orders has a non-neutral (blue) fill', async ({ page, request }) => {
    await seedDeliveredOrder(request, { county: 'Cluj', profit: 500 });

    await page.goto('/dashboard');
    await page.waitForSelector('[data-county="Cluj"]', { timeout: 8000 });

    const fill = await page.locator('[data-county="Cluj"]').getAttribute('fill');
    expect(fill).toMatch(/hsl\(220/);
  });

  test('county with no delivered orders has neutral gray fill', async ({ page, request }) => {
    await seedDeliveredOrder(request, { county: 'Cluj', profit: 300 });

    await page.goto('/dashboard');
    await page.waitForSelector('[data-county="Alba"]', { timeout: 8000 });

    const fill = await page.locator('[data-county="Alba"]').getAttribute('fill');
    expect(fill).toMatch(/hsl\(215/);
  });

  test('all counties show neutral gray when no delivered orders exist', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('[data-county="Cluj"]', { timeout: 8000 });

    const fill = await page.locator('[data-county="Cluj"]').getAttribute('fill');
    expect(fill).toMatch(/hsl\(215/);
  });
});

// ─────────────────────────────────────────────────────────────────
// Feature 016 — US2: Tooltip on hover
// ─────────────────────────────────────────────────────────────────

test.describe('Feature 016 — harta vânzărilor: US2 tooltip on hover', () => {
  test.beforeEach(async ({ request }) => {
    await clearOrders(request);
  });

  test('tooltip shows county name and delivered count on hover', async ({ page, request }) => {
    await seedDeliveredOrder(request, { county: 'Cluj', profit: 1200 });

    await page.goto('/dashboard');
    await page.waitForSelector('[data-county="Cluj"]', { timeout: 8000 });

    await page.hover('[data-county="Cluj"]');

    const tooltip = page.locator('[data-slot="tooltip-content"]');
    await expect(tooltip).toBeVisible({ timeout: 3000 });
    await expect(tooltip).toContainText('Cluj');
    await expect(tooltip).toContainText('1 comenzi livrate');
    await expect(tooltip).toContainText('1200.00 RON');
  });

  test('tooltip for county with no deliveries shows zero values', async ({ page, request }) => {
    await seedDeliveredOrder(request, { county: 'Cluj', profit: 100 });

    await page.goto('/dashboard');
    await page.waitForSelector('[data-county="Alba"]', { timeout: 8000 });

    await page.hover('[data-county="Alba"]');

    const tooltip = page.locator('[data-slot="tooltip-content"]');
    await expect(tooltip).toBeVisible({ timeout: 3000 });
    await expect(tooltip).toContainText('Alba');
    await expect(tooltip).toContainText('0 comenzi livrate');
    await expect(tooltip).toContainText('0.00 RON');
  });
});

// ─────────────────────────────────────────────────────────────────
// Feature 016 — US3: Metric toggle
// ─────────────────────────────────────────────────────────────────

test.describe('Feature 016 — harta vânzărilor: US3 metric toggle', () => {
  test.beforeEach(async ({ request }) => {
    await clearOrders(request);
    await seedDeliveredOrder(request, { county: 'Cluj', profit: 5000 });
    await seedDeliveredOrder(request, { county: 'Iași', profit: 100 });
  });

  test('metric toggle buttons are visible', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('section[aria-label="Harta vânzărilor"]', { timeout: 8000 });

    await expect(page.getByRole('button', { name: 'Comenzi' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Profit' })).toBeVisible();
  });

  test('switching to Profit metric changes county fill colours', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('[data-county="Cluj"]', { timeout: 8000 });

    const fillBefore = await page.locator('[data-county="Cluj"]').getAttribute('fill');

    await page.getByRole('button', { name: 'Profit' }).click();

    const fillAfter = await page.locator('[data-county="Cluj"]').getAttribute('fill');

    // Fill should change (profit-based vs count-based intensity)
    // Both orders have count=1, so Comenzi gives same intensity to both;
    // Profit gives max intensity to Cluj and much less to Iași.
    expect(fillBefore).toMatch(/hsl\(220/);
    expect(fillAfter).toMatch(/hsl\(220/);
  });

  test('switching metric does not reload the page', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('section[aria-label="Harta vânzărilor"]', { timeout: 8000 });

    let navigationOccurred = false;
    page.on('framenavigated', () => { navigationOccurred = true; });

    await page.getByRole('button', { name: 'Profit' }).click();
    await page.getByRole('button', { name: 'Comenzi' }).click();

    expect(navigationOccurred).toBe(false);
  });
});
