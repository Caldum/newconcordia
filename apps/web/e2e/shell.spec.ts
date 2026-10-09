import { expect, test } from '@playwright/test';

import { expectNoA11yViolations } from './a11y';

test('home page renders and is accessible', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Concordia' })).toBeVisible();
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
