const { test, expect } = require('@playwright/test');

const NAV = 'nav[aria-label="Navigare principală"]';

function navLink(page, name) {
  return page.locator(NAV).getByRole('link', { name });
}

// ── API helpers ──────────────────────────────────────────────────
async function clearOrders(request) {
  const { orders } = await (await request.get('/api/orders')).json();
  await Promise.all(orders.map((o) => request.delete(`/api/orders/${o.id}`)));
}
async function clearCatalog(request) {
  const { templates } = await (await request.get('/api/catalog')).json();
  await Promise.all(templates.map((t) => request.delete(`/api/catalog/${t.id}`)));
}

async function seedOrder(request, name, profit = null) {
  const { order } = await (
    await request.post('/api/orders', { data: { name } })
  ).json();
  if (profit !== null) {
    await request.patch(`/api/orders/${order.id}`, { data: { profit } });
  }
  return order;
}

async function seedCatalogTemplate(request, name) {
  const { template } = await (
    await request.post('/api/catalog', { data: { name } })
  ).json();
  return template;
}

async function seedOrderWithTemplate(request, orderName, templateId) {
  const { order } = await (
    await request.post('/api/orders', {
      data: { name: orderName, templateIds: [templateId] },
    })
  ).json();
  return order;
}

// ── RSC delay helper — intercepts Next.js navigation to /dashboard ──
async function delayDashboardRSC(page, ms = 800) {
  await page.route('http://localhost:3000/dashboard', async (route, request) => {
    if (request.headers()['rsc'] === '1') {
      await new Promise((resolve) => setTimeout(resolve, ms));
    }
    await route.continue();
  });
}

// ─────────────────────────────────────────────────────────────────
// US1: Monthly profit chart
// ─────────────────────────────────────────────────────────────────

test.describe('Feature 010 — dashboard: US1 monthly profit chart', () => {
  test('Dashboard nav link is visible and navigates to /dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(navLink(page, 'Dashboard')).toBeVisible();
    navLink(page, 'Dashboard').click();
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('Monthly profit chart section is visible with seeded data', async ({ page, request }) => {
    await clearOrders(request);
    const order = await seedOrder(request, 'Comanda Test Profit', 500);

    await page.goto('/dashboard');

    await expect(page.locator('section[aria-label="Profit lunar"]')).toBeVisible({
      timeout: 8000,
    });

    await request.delete(`/api/orders/${order.id}`);
  });

  test('Empty state shown for monthly chart when no orders exist', async ({ page, request }) => {
    await clearOrders(request);

    await page.goto('/dashboard');

    await expect(
      page.locator('text=Nu există date de profit înregistrate.')
    ).toBeVisible({ timeout: 8000 });
  });

  test('Loading skeleton appears during SPA navigation to /dashboard', async ({ page }) => {
    await delayDashboardRSC(page);

    await page.goto('/');
    navLink(page, 'Dashboard').click();

    await expect(
      page.locator('[role="status"][aria-label="Se încarcă…"]')
    ).toBeVisible({ timeout: 5000 });

    await page.unrouteAll();
    await expect(page).toHaveURL('/dashboard');
  });
});

// ─────────────────────────────────────────────────────────────────
// US2: Top products ranking
// ─────────────────────────────────────────────────────────────────

test.describe('Feature 010 — dashboard: US2 top products ranking', () => {
  test.beforeEach(async ({ request }) => {
    await clearOrders(request);
    await clearCatalog(request);
  });

  test('Top products section is visible with seeded data', async ({ page, request }) => {
    const template = await seedCatalogTemplate(request, 'Produs Test Dashboard');
    await seedOrderWithTemplate(request, 'Comanda A', template.id);
    await seedOrderWithTemplate(request, 'Comanda B', template.id);

    await page.goto('/dashboard');

    const section = page.locator('section[aria-label="Top produse"]');
    await expect(section).toBeVisible({ timeout: 8000 });
    // recharts splits SVG tick labels across tspan elements; use regex to match words
    await expect(section).toContainText(/Produs\s*Test\s*Dashboard/);
  });

  test('Empty state shown for top products when no orders exist', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(
      page.locator('text=Nu există produse în comenzi.')
    ).toBeVisible({ timeout: 8000 });
  });
});

// ─────────────────────────────────────────────────────────────────
// US3: KPI cards
// ─────────────────────────────────────────────────────────────────

test.describe('Feature 010 — dashboard: US3 KPI cards', () => {
  test.beforeEach(async ({ request }) => {
    await clearOrders(request);
  });

  test('Three KPI cards are visible', async ({ page }) => {
    await page.goto('/dashboard');

    const section = page.locator('section[aria-label="KPI-uri"]');
    await expect(section).toBeVisible({ timeout: 8000 });
    await expect(section.locator('.rounded-lg.shadow-sm')).toHaveCount(3);
  });

  test('KPI total orders matches seeded order count', async ({ page, request }) => {
    await seedOrder(request, 'Comanda KPI 1');
    await seedOrder(request, 'Comanda KPI 2');

    await page.goto('/dashboard');

    const section = page.locator('section[aria-label="KPI-uri"]');
    await expect(section).toBeVisible({ timeout: 8000 });

    // First card is "Total Comenzi" — value should be "2"
    await expect(section.locator('.rounded-lg.shadow-sm').first()).toContainText('2');
  });

  test('KPI cards show zero values with no orders', async ({ page }) => {
    await page.goto('/dashboard');

    const section = page.locator('section[aria-label="KPI-uri"]');
    await expect(section).toBeVisible({ timeout: 8000 });

    // All cards should show "0" values
    await expect(section.locator('.rounded-lg.shadow-sm').first()).toContainText('0');
  });
});
