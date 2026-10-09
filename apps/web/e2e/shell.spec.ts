import { expect, test } from '@playwright/test';

import { expectNoA11yViolations } from './a11y';

test('landing renders and is accessible', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { level: 1, name: 'El mundo está cambiando' }),
  ).toBeVisible();
  // Not an exact count: the admin journey turns a country off and on while this runs.
  await expect(page.getByText(/^\d+ países en juego$/)).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expectNoA11yViolations(page);
});

test('unknown deep link falls back to the SPA and shows the not-found page', async ({ page }) => {
  const response = await page.goto('/una/ruta/que/no/existe');
  expect(response?.headers()['content-security-policy']).toContain("default-src 'self'");
  await expect(
    page.getByRole('heading', { level: 1, name: 'Esta página no está en el mapa.' }),
  ).toBeVisible();
  await expectNoA11yViolations(page);
});

test.describe('in an English-speaking browser', () => {
  test.use({ locale: 'en-US' });

  test('shows the English copy and sets <html lang="en">', async ({ page }) => {
    await page.goto('/missing-page');
    await expect(
      page.getByRole('heading', { level: 1, name: 'This page is not on the map.' }),
    ).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expectNoA11yViolations(page);
  });
});
