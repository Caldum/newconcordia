import { expect, test } from '@playwright/test';

import { expectNoA11yViolations } from './a11y';
import { sql } from './db';
import { createConfirmedPlayer, signIn } from './players';
import { stubTurnstile } from './turnstile';

test.beforeEach(async ({ page }) => {
  await stubTurnstile(page);
});

// Acceptance test from the GDD (D06), first half: an approved request grants citizenship.
test('the Interior minister approves a request and the player becomes a citizen', async ({
  browser,
  request,
}) => {
  const minister = await createConfirmedPlayer(request, 'ARG');
  const player = await createConfirmedPlayer(request, 'FRA');
  await sql(
    `insert into game.offices (country_code, office, user_id) values ('ARG', 'interior_minister', $1)
     on conflict (country_code, office) do update set user_id = excluded.user_id`,
    [minister.id],
  );

  const playerPage = await (await browser.newContext({ locale: 'es-AR' })).newPage();
  await stubTurnstile(playerPage);
  await signIn(playerPage, player);
  await playerPage
    .getByRole('navigation', { name: 'Principal' })
    .getByRole('link', { name: 'Ciudadanía' })
    .click();
  await playerPage.getByRole('link', { name: 'Cambiar de país' }).click();
  await playerPage.getByRole('radio', { name: 'Argentina' }).click();
  await expect(playerPage.getByText('Revisión del ministro del Interior')).toBeVisible();
  await expectNoA11yViolations(playerPage);
  await playerPage.getByRole('button', { name: 'Pedir la ciudadanía de Argentina' }).click();
  await expect(playerPage.getByRole('heading', { level: 1, name: 'Pedido enviado' })).toBeVisible();

  const ministerPage = await (await browser.newContext({ locale: 'es-AR' })).newPage();
  await stubTurnstile(ministerPage);
  await signIn(ministerPage, minister);
  await ministerPage.goto('/citizenship/requests');
  await expect(
    ministerPage.getByRole('heading', { level: 1, name: 'Pedidos de ciudadanía' }),
  ).toBeVisible();
  await expectNoA11yViolations(ministerPage);
  await ministerPage.getByRole('button', { name: `Aprobar el pedido de ${player.name}` }).click();
  await expect(ministerPage.getByText(`Aprobaste el pedido de ${player.name}.`)).toBeVisible();

  await playerPage.goto('/');
  await expect(playerPage.getByText('Ciudadanía: Argentina')).toBeVisible();
});

// Acceptance test from the GDD (D06), second half: without an answer, approved on its own at 72 hours.
test('a request nobody answers is approved by the hourly job after 72 hours', async ({
  page,
  request,
}) => {
  const player = await createConfirmedPlayer(request, 'ESP');
  await signIn(page, player);
  await page.goto('/citizenship/change');
  await page.getByRole('radio', { name: 'Chile' }).click();
  await page.getByRole('button', { name: 'Pedir la ciudadanía de Chile' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Pedido enviado' })).toBeVisible();

  // Move this request 72 hours into the past and run the job for an unused slot, as the clock Worker would.
  await sql(
    `update game.citizenship_requests set created_at = '2000-01-01 00:00+00'
     where user_id = (select id from auth.users where email = $1) and status = 'pending'`,
    [player.email],
  );
  const slot = new Date(Date.UTC(2001, 0, 1) + Math.floor(Math.random() * 8000) * 3_600_000);
  await sql("select public.run_job('citizenship_timeouts', $1)", [slot.toISOString()]);

  await page.goto('/citizenship');
  await expect(
    page.getByRole('article', { name: 'Documento de ciudadanía, República de Chile' }),
  ).toBeVisible();
  await expect(page.getByText(/^CHL-\d{6}$/)).toBeVisible();
});

test('a sign-up for a country not in play joins its waitlist', async ({ page }) => {
  await page.goto('/sign-up');
  await page.getByRole('radio', { name: 'Otro país' }).click();
  await page.getByLabel('País que quieres esperar').selectOption({ label: 'Uruguay' });
  await expect(page.getByText('Uruguay no está disponible actualmente.')).toBeVisible();
  await expect(page.getByRole('group', { name: '¿Dónde quieres comenzar?' })).toBeVisible();
  await expectNoA11yViolations(page);
});
