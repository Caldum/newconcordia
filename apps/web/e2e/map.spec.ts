import { expect, test } from '@playwright/test';

import { expectNoA11yViolations } from './a11y';
import { sql } from './db';

const cuyo = '[data-shape="ARG-05"]';

test.describe('map', () => {
  test.afterEach(async () => {
    await sql("update game.regions set owner_country_code = 'ARG' where code = 'ARG-05'");
  });

  // GDD acceptance test for D04.
  test('changing a region owner in the database changes its color after reloading', async ({
    page,
  }) => {
    await page.goto('/map');
    await expect(page.locator(cuyo)).toHaveAttribute('fill', '#6CACE4');

    await sql("update game.regions set owner_country_code = 'ESP' where code = 'ARG-05'");
    await page.reload();

    await expect(page.locator(cuyo)).toHaveAttribute('fill', '#D0453A');
  });

  test('finds a region with the keyboard and describes it', async ({ page }) => {
    await page.goto('/map');
    const search = page.getByRole('combobox', { name: 'Buscar un país o una región' });
    await search.fill('cuyo');
    await search.press('Enter');
    await expect(page.getByRole('heading', { level: 2, name: 'Cuyo' })).toBeVisible();
    await expect(page.getByText('Bajo control de Argentina.')).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test('loads the geometry as a hashed, immutable asset', async ({ page }) => {
    const geometry = page.waitForResponse((response) =>
      /\/assets\/world-regions-[\w-]+\.json$/.test(response.url()),
    );
    await page.goto('/map');
    const response = await geometry;
    expect(response.headers()['cache-control']).toBe('public, max-age=31536000, immutable');
  });
});
