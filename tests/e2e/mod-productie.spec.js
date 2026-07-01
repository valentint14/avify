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

async function createTemplate(request, name) {
  const { template } = await (
    await request.post('/api/catalog', { data: { name } })
  ).json();
  return template;
}

async function createOrderWithTemplate(request, orderName, templateId, quantity = 1) {
  const res = await request.post('/api/orders', {
    data: { name: orderName, templateIds: [templateId] },
  });
  const { order, products } = await res.json();
  if (quantity !== 1 && products.length > 0) {
    await request.patch(`/api/products/${products[0].id}`, {
      data: { quantity },
    });
  }
  return order;
}

// ─────────────────────────────────────────────────────────────────
// US1: View Aggregated Production Queue
// ─────────────────────────────────────────────────────────────────

test.describe('Feature 013 — mod-productie: US1 aggregated queue', () => {
  test.beforeEach(async ({ request }) => {
    await clearOrders(request);
    await clearCatalog(request);
  });

  test('"Mod producție" nav link is visible and navigates to /mod-productie', async ({ page }) => {
    await page.goto('/');
    await expect(navLink(page, 'Mod producție')).toBeVisible();
    await navLink(page, 'Mod producție').click();
    await expect(page).toHaveURL('/mod-productie');
  });

  test('page heading "Mod producție" is visible', async ({ page }) => {
    await page.goto('/mod-productie');
    await expect(page.locator('h1')).toContainText('Mod producție');
  });

  test('shows empty state when no de_realizat products exist', async ({ page }) => {
    await page.goto('/mod-productie');
    await expect(
      page.locator('text=Nicio comandă nu are produse de realizat.')
    ).toBeVisible({ timeout: 8000 });
  });

  test('aggregates quantities for same template across two orders', async ({ page, request }) => {
    const template = await createTemplate(request, 'Banner E2E Test');
    await createOrderWithTemplate(request, 'Comanda A', template.id, 3);
    await createOrderWithTemplate(request, 'Comanda B', template.id, 5);

    await page.goto('/mod-productie');

    const groupRow = page
      .locator('[data-testid="production-group"]')
      .filter({ hasText: 'Banner E2E Test' });
    await expect(groupRow).toBeVisible({ timeout: 8000 });
    await expect(groupRow).toContainText('8');
  });

  test('groups are sorted by total quantity descending', async ({ page, request }) => {
    const t1 = await createTemplate(request, 'Produs Mic E2E');
    const t2 = await createTemplate(request, 'Produs Mare E2E');
    await createOrderWithTemplate(request, 'Comanda A', t1.id, 2);
    await createOrderWithTemplate(request, 'Comanda B', t2.id, 9);

    await page.goto('/mod-productie');

    const groups = page.locator('[data-testid="production-group"]');
    await expect(groups).toHaveCount(2, { timeout: 8000 });
    await expect(groups.first()).toContainText('Produs Mare E2E');
    await expect(groups.last()).toContainText('Produs Mic E2E');
  });
});

// ─────────────────────────────────────────────────────────────────
// US2: Drill Down Into a Production Group
// ─────────────────────────────────────────────────────────────────

test.describe('Feature 013 — mod-productie: US2 drill-down', () => {
  test.beforeEach(async ({ request }) => {
    await clearOrders(request);
    await clearCatalog(request);
  });

  test('clicking a group expands it to show contributing orders', async ({ page, request }) => {
    const template = await createTemplate(request, 'Invitatie E2E');
    await createOrderWithTemplate(request, 'Comanda Alpha', template.id, 3);
    await createOrderWithTemplate(request, 'Comanda Beta', template.id, 5);

    await page.goto('/mod-productie');

    const groupRow = page
      .locator('[data-testid="production-group"]')
      .filter({ hasText: 'Invitatie E2E' });
    await expect(groupRow).toBeVisible({ timeout: 8000 });

    const toggleBtn = groupRow.locator('button').first();
    await expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
    await toggleBtn.click();
    await expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');

    const ordersList = page.locator('[data-testid="orders-list"]').first();
    await expect(ordersList).toBeVisible();
    await expect(ordersList).toContainText('Comanda Alpha');
    await expect(ordersList).toContainText('Comanda Beta');
  });

  test('clicking expanded group collapses it', async ({ page, request }) => {
    const template = await createTemplate(request, 'Meniu E2E');
    await createOrderWithTemplate(request, 'Comanda Gamma', template.id, 2);

    await page.goto('/mod-productie');

    const groupRow = page
      .locator('[data-testid="production-group"]')
      .filter({ hasText: 'Meniu E2E' });
    await expect(groupRow).toBeVisible({ timeout: 8000 });

    const toggleBtn = groupRow.locator('button').first();
    await toggleBtn.click();
    await expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');

    await toggleBtn.click();
    await expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');

    const ordersList = page.locator('[data-testid="orders-list"]').first();
    await expect(ordersList).not.toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────
// US3: Refresh Production Queue on Demand
// ─────────────────────────────────────────────────────────────────

test.describe('Feature 013 — mod-productie: US3 refresh', () => {
  test.beforeEach(async ({ request }) => {
    await clearOrders(request);
    await clearCatalog(request);
  });

  test('refresh button is visible with aria-label', async ({ page }) => {
    await page.goto('/mod-productie');
    await expect(
      page.locator('button[aria-label="Reîncarcă coada de producție"]')
    ).toBeVisible({ timeout: 8000 });
  });

  test('clicking refresh updates production queue with newly added data', async ({
    page,
    request,
  }) => {
    await page.goto('/mod-productie');
    await expect(
      page.locator('text=Nicio comandă nu are produse de realizat.')
    ).toBeVisible({ timeout: 8000 });

    const template = await createTemplate(request, 'Produs Nou E2E');
    await createOrderWithTemplate(request, 'Comanda Noua', template.id, 6);

    await page.locator('button[aria-label="Reîncarcă coada de producție"]').click();

    await expect(
      page.locator('[data-testid="production-group"]').filter({ hasText: 'Produs Nou E2E' })
    ).toBeVisible({ timeout: 8000 });
  });

  test('"Actualizat la" timestamp is visible', async ({ page }) => {
    await page.goto('/mod-productie');
    await expect(page.locator('text=Actualizat la')).toBeVisible({ timeout: 8000 });
  });
});
