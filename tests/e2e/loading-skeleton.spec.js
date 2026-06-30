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
async function clearMaterials(request) {
  const { materials } = await (await request.get('/api/materials')).json();
  await Promise.all(materials.map((m) => request.delete(`/api/materials/${m.id}`)));
}

// ── Route-level RSC delay — intercepts Next.js RSC navigation requests ──
// Next.js SPA navigation sends a fetch with header `rsc: 1` to the page URL.
// Delaying it forces the loading.js skeleton to be visible long enough for assertions.
async function delayRSC(page, targetPath, ms = 800) {
  const url = `http://localhost:3000${targetPath}`;
  await page.route(url, async (route, request) => {
    if (request.headers()['rsc'] === '1') {
      await new Promise((resolve) => setTimeout(resolve, ms));
    }
    await route.continue();
  });
}

// ─────────────────────────────────────────────────────────────────────────
// US1 + US2: Skeleton visible during SPA navigation; shape is correct
// ─────────────────────────────────────────────────────────────────────────

test.describe('Feature 001 — loading skeleton: US1 + US2', () => {
  test('Orders skeleton appears during SPA navigation, has 5 rows and animate-pulse', async ({
    page,
  }) => {
    // Delay RSC requests to '/' so the loading state is observable
    await delayRSC(page, '/');

    await page.goto('/catalog');

    // Start SPA navigation — do NOT await so we can inspect the interim state
    navLink(page, 'Comenzi').click();

    const skeleton = page.locator('[role="status"][aria-label="Se încarcă…"]');
    await expect(skeleton).toBeVisible({ timeout: 5000 });

    // US2: 5 order-row placeholders (order rows use rounded-lg; form rows n/a)
    const rows = skeleton.locator('div.rounded-lg.shadow-sm');
    await expect(rows).toHaveCount(5);

    // US2: shimmer animation class present
    await expect(skeleton.locator('.animate-pulse').first()).toBeVisible();

    await page.unrouteAll();
    await expect(page).toHaveURL('/');
    await expect(skeleton).not.toBeVisible({ timeout: 10000 });
  });

  test('Catalog skeleton appears during SPA navigation, has 5 rows', async ({ page }) => {
    // Delay RSC requests to '/catalog'
    await delayRSC(page, '/catalog');

    await page.goto('/');

    navLink(page, 'Catalog Produse').click();

    const skeleton = page.locator('[role="status"][aria-label="Se încarcă…"]');
    await expect(skeleton).toBeVisible({ timeout: 5000 });

    // US2: 5 catalog item rows use rounded-md; form card uses rounded-lg
    const rows = skeleton.locator('div.rounded-md.shadow-sm');
    await expect(rows).toHaveCount(5);

    await page.unrouteAll();
    await expect(page).toHaveURL('/catalog');
    await expect(skeleton).not.toBeVisible({ timeout: 10000 });
  });

  test('Materials skeleton appears during SPA navigation, has 5 rows', async ({ page }) => {
    // Delay RSC requests to '/stoc-materiale'
    await delayRSC(page, '/stoc-materiale');

    await page.goto('/');

    navLink(page, 'Stoc Materiale').click();

    const skeleton = page.locator('[role="status"][aria-label="Se încarcă…"]');
    await expect(skeleton).toBeVisible({ timeout: 5000 });

    // US2: 5 material rows use rounded-md; form card uses rounded-lg
    const rows = skeleton.locator('div.rounded-md.shadow-sm');
    await expect(rows).toHaveCount(5);

    await page.unrouteAll();
    await expect(page).toHaveURL('/stoc-materiale');
    await expect(skeleton).not.toBeVisible({ timeout: 10000 });
  });

  test('US1 acceptance 4: no blank page — skeleton or real content always visible after navigation', async ({
    page,
  }) => {
    await page.goto('/catalog');

    navLink(page, 'Comenzi').click();

    // Either skeleton or real content must be visible within 2 seconds — no blank screen
    const skeleton = page.locator('[role="status"][aria-label="Se încarcă…"]');
    const orderRows = page.locator('[data-testid="order-row"]');
    const emptyMsg = page.locator('text=Nu există comenzi');

    await expect(skeleton.or(orderRows.first()).or(emptyMsg)).toBeVisible({ timeout: 2000 });
    await expect(page).toHaveURL('/');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// US3: No regression — fresh data visible after skeleton resolves
// ─────────────────────────────────────────────────────────────────────────

test.describe('Feature 001 — loading skeleton: US3 data freshness', () => {
  test.beforeEach(async ({ request }) => {
    await clearOrders(request);
    await clearCatalog(request);
    await clearMaterials(request);
  });

  test('Orders: seeded order is visible after skeleton resolves', async ({ page, request }) => {
    const { order } = await (
      await request.post('/api/orders', { data: { name: 'Comanda Test Skeleton' } })
    ).json();

    await page.goto('/');

    // Wait for real order row — skeleton has resolved
    await expect(
      page.locator('[data-testid="order-row"]').filter({ hasText: 'Comanda Test Skeleton' })
    ).toBeVisible({ timeout: 8000 });

    // Skeleton must be gone
    await expect(
      page.locator('[role="status"][aria-label="Se încarcă…"]')
    ).not.toBeVisible();

    await request.delete(`/api/orders/${order.id}`);
  });

  test('Catalog: seeded template is visible after skeleton resolves', async ({ page, request }) => {
    const { template } = await (
      await request.post('/api/catalog', { data: { name: 'Produs Test Skeleton' } })
    ).json();

    await page.goto('/catalog');

    await expect(
      page.locator('[data-testid="catalog-item"]').filter({ hasText: 'Produs Test Skeleton' })
    ).toBeVisible({ timeout: 8000 });

    await expect(
      page.locator('[role="status"][aria-label="Se încarcă…"]')
    ).not.toBeVisible();

    await request.delete(`/api/catalog/${template.id}`);
  });

  test('Materials: seeded material is visible after skeleton resolves', async ({ page, request }) => {
    const { material } = await (
      await request.post('/api/materials', {
        data: { name: 'Material Test Skeleton', currentStock: 10, minStock: 2 },
      })
    ).json();

    await page.goto('/stoc-materiale');

    await expect(
      page.locator('[data-testid="material-row"]').filter({ hasText: 'Material Test Skeleton' })
    ).toBeVisible({ timeout: 8000 });

    await expect(
      page.locator('[role="status"][aria-label="Se încarcă…"]')
    ).not.toBeVisible();

    await request.delete(`/api/materials/${material.id}`);
  });
});
