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

async function seedOrder(request, name, fields = {}) {
  const { order } = await (
    await request.post('/api/orders', { data: { name, ...fields } })
  ).json();
  return order;
}

// ── Hydration guard — CalendarGrid sets data-hydrated="true" via useEffect ──
// useEffect only runs on the client after hydration, so this attribute is
// absent from the SSR HTML and present only once React has fully mounted.
async function waitForCalendarHydration(page) {
  await page.locator('[data-hydrated="true"]').waitFor({ state: 'visible', timeout: 8000 });
}

// ── RSC delay helper — intercepts Next.js navigation to /calendar ──
async function delayCalendarRSC(page, ms = 800) {
  await page.route('http://localhost:3000/calendar', async (route, request) => {
    if (request.headers()['rsc'] === '1') {
      await new Promise((resolve) => setTimeout(resolve, ms));
    }
    await route.continue();
  });
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function nextMonthFirstDay() {
  const d = new Date();
  const nextM = d.getMonth() === 11 ? 0 : d.getMonth() + 1;
  const nextY = d.getMonth() === 11 ? d.getFullYear() + 1 : d.getFullYear();
  return `${nextY}-${String(nextM + 1).padStart(2, '0')}-01`;
}

// ─────────────────────────────────────────────────────────────────
// US1: Monthly grid and event chips
// ─────────────────────────────────────────────────────────────────

test.describe('Feature 011 — calendar: US1 monthly grid', () => {
  test('Calendar nav link is visible and navigates to /calendar', async ({ page }) => {
    await page.goto('/');
    await expect(navLink(page, 'Calendar')).toBeVisible();
    await navLink(page, 'Calendar').click();
    await expect(page).toHaveURL('/calendar');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('Monthly grid renders with Romanian weekday headers', async ({ page }) => {
    await page.goto('/calendar');
    for (const day of ['Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm', 'Dum']) {
      await expect(page.getByText(day).first()).toBeVisible({ timeout: 8000 });
    }
  });

  test('Orders with event_date appear as blue chips', async ({ page, request }) => {
    await clearOrders(request);
    await seedOrder(request, 'Test Eveniment', { eventDate: today() });

    await page.goto('/calendar');

    await expect(page.locator('.bg-blue-100').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('.bg-blue-100').first()).toContainText('Ev:');

    await clearOrders(request);
  });

  test('Orders with delivery_date appear as amber chips', async ({ page, request }) => {
    await clearOrders(request);
    await seedOrder(request, 'Test Livrare', { deliveryDate: today() });

    await page.goto('/calendar');

    await expect(page.locator('.bg-amber-100').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('.bg-amber-100').first()).toContainText('Liv:');

    await clearOrders(request);
  });

  test('Loading skeleton appears during SPA navigation to /calendar', async ({ page }) => {
    await delayCalendarRSC(page);

    await page.goto('/');
    navLink(page, 'Calendar').click();

    await expect(
      page.locator('[role="status"][aria-label="Se încarcă…"]')
    ).toBeVisible({ timeout: 5000 });

    await page.unrouteAll();
    await expect(page).toHaveURL('/calendar');
  });

  test('Empty month shows grid without errors', async ({ page, request }) => {
    await clearOrders(request);
    await page.goto('/calendar');
    // Navigate many months forward — no orders should be there
    for (let i = 0; i < 18; i++) {
      await page.getByRole('button', { name: 'Luna următoare' }).click();
    }
    await expect(page.locator('.bg-blue-100')).toHaveCount(0);
    await expect(page.locator('.bg-amber-100')).toHaveCount(0);
  });
});

// ─────────────────────────────────────────────────────────────────
// US2: Order detail dialog
// ─────────────────────────────────────────────────────────────────

test.describe('Feature 011 — calendar: US2 order detail dialog', () => {
  test.beforeEach(async ({ request }) => {
    await clearOrders(request);
  });

  test('Clicking a chip opens the order detail dialog', async ({ page, request }) => {
    await seedOrder(request, 'Comanda Dialog Test', { eventDate: today() });

    await page.goto('/calendar');
    await waitForCalendarHydration(page);
    await page.locator('.bg-blue-100').first().click();

    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[role="dialog"]')).toContainText('Comanda Dialog Test');
  });

  test('Dialog shows order metadata including client', async ({ page, request }) => {
    await seedOrder(request, 'Comanda Meta Test', {
      eventDate: today(),
      client: 'Client Test Calendar',
    });

    await page.goto('/calendar');
    await waitForCalendarHydration(page);
    await page.locator('.bg-blue-100').first().click();

    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[role="dialog"]')).toContainText('Client Test Calendar');
  });

  test('Dialog closes on Escape key', async ({ page, request }) => {
    await seedOrder(request, 'Comanda Escape Test', { eventDate: today() });

    await page.goto('/calendar');
    await waitForCalendarHydration(page);
    await page.locator('.bg-blue-100').first().click();
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });

    await page.keyboard.press('Escape');
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3000 });
  });

  test('Dialog shows Produse section', async ({ page, request }) => {
    await seedOrder(request, 'Comanda Produse Test', { eventDate: today() });

    await page.goto('/calendar');
    await waitForCalendarHydration(page);
    await page.locator('.bg-blue-100').first().click();

    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[role="dialog"]')).toContainText('Produse', { timeout: 5000 });
  });

  test('Dialog shows Eveniment badge for event_date chip', async ({ page, request }) => {
    await seedOrder(request, 'Comanda Badge Test', { eventDate: today() });

    await page.goto('/calendar');
    await waitForCalendarHydration(page);
    await page.locator('.bg-blue-100').first().click();

    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[role="dialog"]')).toContainText('Eveniment');
  });

  test('Dialog shows Livrare badge for delivery_date chip', async ({ page, request }) => {
    await seedOrder(request, 'Comanda Livrare Badge', { deliveryDate: today() });

    await page.goto('/calendar');
    await waitForCalendarHydration(page);
    await page.locator('.bg-amber-100').first().click();

    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[role="dialog"]')).toContainText('Livrare');
  });
});

// ─────────────────────────────────────────────────────────────────
// US3: Month navigation
// ─────────────────────────────────────────────────────────────────

test.describe('Feature 011 — calendar: US3 month navigation', () => {
  test.beforeEach(async ({ request }) => {
    await clearOrders(request);
  });

  test('Luna anterioară button navigates to previous month', async ({ page }) => {
    await page.goto('/calendar');
    await waitForCalendarHydration(page);
    const beforeText = await page.locator('h1').textContent();
    await page.getByRole('button', { name: 'Luna anterioară' }).click();
    await expect(page.locator('h1')).not.toHaveText(beforeText, { timeout: 2000 });
  });

  test('Azi button returns to current month', async ({ page }) => {
    await page.goto('/calendar');
    await page.getByRole('button', { name: 'Luna următoare' }).click();
    await page.getByRole('button', { name: 'Luna următoare' }).click();
    await page.getByRole('button', { name: 'Azi' }).click();

    const currentMonth = new Intl.DateTimeFormat('ro-RO', { month: 'long' })
      .format(new Date())
      .replace(/^\w/, (c) => c.toUpperCase());

    await expect(page.locator('h1')).toContainText(currentMonth, { timeout: 2000 });
  });

  test('Order with next-month event_date appears only after navigation', async ({
    page,
    request,
  }) => {
    await seedOrder(request, 'Comanda Luna Urm', { eventDate: nextMonthFirstDay() });

    await page.goto('/calendar');
    await waitForCalendarHydration(page);
    // Current month — chip must NOT be visible
    await expect(page.locator('.bg-blue-100')).toHaveCount(0);

    // Navigate to next month — chip must appear
    await page.getByRole('button', { name: 'Luna următoare' }).click();
    await expect(page.locator('.bg-blue-100').first()).toBeVisible({ timeout: 5000 });
  });

  test('Navigation heading updates to correct month name', async ({ page }) => {
    await page.goto('/calendar');
    await page.getByRole('button', { name: 'Luna următoare' }).click();

    const nextMonth = new Intl.DateTimeFormat('ro-RO', { month: 'long' })
      .format(new Date(new Date().getFullYear(), new Date().getMonth() + 1))
      .replace(/^\w/, (c) => c.toUpperCase());

    await expect(page.locator('h1')).toContainText(nextMonth, { timeout: 2000 });
  });
});
