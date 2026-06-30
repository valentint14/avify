const { test, expect } = require('@playwright/test');

async function clearOrders(request) {
  const res = await request.get('/api/orders');
  const { orders } = await res.json();
  await Promise.all(orders.map((o) => request.delete(`/api/orders/${o.id}`)));
}

const NAV = 'nav[aria-label="Navigare principală"]';

function navLink(page, name) {
  return page.locator(NAV).getByRole('link', { name });
}

test.describe('Navbar — US1: navigate between pages', () => {
  test('navbar renders on load with brand and both links', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator(NAV)).toBeVisible();
    await expect(page.locator(NAV).getByText('Avify')).toBeVisible();
    await expect(navLink(page, 'Comenzi')).toBeVisible();
    await expect(navLink(page, 'Catalog Produse')).toBeVisible();
  });

  test('clicking Catalog Produse navigates to /catalog and Comenzi navigates back', async ({ page }) => {
    await page.goto('/');
    await navLink(page, 'Catalog Produse').click();
    await expect(page).toHaveURL('/catalog');

    await navLink(page, 'Comenzi').click();
    await expect(page).toHaveURL('/');
  });
});

test.describe('Navbar — US2: active page highlight', () => {
  test('on "/" the Comenzi link is active and Catalog Produse is not', async ({ page }) => {
    await page.goto('/');
    await expect(navLink(page, 'Comenzi')).toHaveAttribute('aria-current', 'page');
    await expect(navLink(page, 'Catalog Produse')).not.toHaveAttribute('aria-current', 'page');
  });

  test('on "/catalog" the Catalog Produse link is active and Comenzi is not', async ({ page }) => {
    await page.goto('/catalog');
    await expect(navLink(page, 'Catalog Produse')).toHaveAttribute('aria-current', 'page');
    await expect(navLink(page, 'Comenzi')).not.toHaveAttribute('aria-current', 'page');
  });
});

test.describe('Navbar — US3: persistent visibility on scroll', () => {
  test.beforeEach(async ({ request }) => {
    await clearOrders(request);
  });

  test('navbar stays pinned at top after scrolling a long page', async ({ page, request }) => {
    // Seed enough orders to make the page scrollable in a short viewport.
    for (let i = 0; i < 12; i += 1) {
      await request.post('/api/orders', { data: { name: `Comanda ${i + 1}` } });
    }
    await page.setViewportSize({ width: 1024, height: 600 });
    await page.goto('/');
    await expect(page.locator(NAV)).toBeVisible();

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Navbar must remain pinned at the top of the viewport.
    await expect(page.locator(NAV)).toBeVisible();
    const top = await page.locator(NAV).evaluate((el) => el.getBoundingClientRect().top);
    expect(top).toBeLessThanOrEqual(1);

    // And still be usable while scrolled.
    await navLink(page, 'Catalog Produse').click();
    await expect(page).toHaveURL('/catalog');
  });
});

test.describe('Navbar — edge case: unknown route', () => {
  test('no link is highlighted on a non-matching route', async ({ page }) => {
    const res = await page.goto('/this-route-does-not-exist');
    // Next.js returns 404 but still renders the root layout (and navbar).
    expect(res.status()).toBe(404);
    await expect(page.locator(`${NAV} [aria-current="page"]`)).toHaveCount(0);
  });
});
