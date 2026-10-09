import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { expectNoA11yViolations } from './a11y';
import { sql } from './db';
import { createConfirmedPlayer, signIn } from './players';
import { stubTurnstile } from './turnstile';

/** Runs the day change for an unused far-future slot, so every scheduled change is due. */
async function runDayChange(): Promise<void> {
  const slot = new Date(Date.UTC(2100, 0, 1, 3) + Math.floor(Math.random() * 30_000) * 86_400_000);
  await sql("select public.run_job('day_change', $1)", [slot.toISOString()]);
}

async function setPortugal(page: Page, inPlay: boolean): Promise<void> {
  await page.goto('/admin');
  const toggle = page.getByRole('switch', { name: 'Portugal en juego' });
  await expect(toggle).toHaveAttribute('aria-checked', String(!inPlay));
  await toggle.click();
  await expect(
    page.getByText('Cambio programado para la próxima medianoche del juego.'),
  ).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-checked', String(inPlay));
  await runDayChange();
}

// Acceptance test from the GDD (D07): deactivating a country turns it gray on the map and records who did it.
test('an admin takes a country out of play: gray on the map and logged', async ({
  page,
  request,
}) => {
  await stubTurnstile(page);
  const admin = await createConfirmedPlayer(request, 'ARG');
  await sql('insert into game.admins (user_id) values ($1)', [admin.id]);
  await signIn(page, admin);

  await page.getByRole('link', { name: 'Administración' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Países y regiones' })).toBeVisible();
  await expectNoA11yViolations(page);

  try {
    await setPortugal(page, false);

    await page.goto('/map');
    const portugal = page.locator('[data-shape="PRT-01"]');
    await expect(page.locator('[data-shape="ESP-03"]')).toHaveAttribute('fill', /#/);
    await expect(portugal).not.toHaveAttribute('fill', /#/);

    await page.goto('/admin');
    const log = page.getByRole('table', { name: 'Registro de acciones' });
    await expect(
      log.getByRole('row').filter({ hasText: 'Se aplicó un cambio de país · Portugal' }).first(),
    ).toContainText(admin.name);
  } finally {
    // Leave the world as other journeys expect it.
    await setPortugal(page, true);
  }
});

test('players do not see the admin panel', async ({ page, request }) => {
  await stubTurnstile(page);
  const player = await createConfirmedPlayer(request, 'ARG');
  await signIn(page, player);
  await expect(page.getByRole('link', { name: 'Administración' })).toHaveCount(0);
  await page.goto('/admin');
  await expect(
    page.getByText('Esta sección es solo para el equipo de administración.'),
  ).toBeVisible();
});
