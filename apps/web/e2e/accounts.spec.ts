import { expect, test } from '@playwright/test';

import { expectNoA11yViolations } from './a11y';
import { linkFromLatestEmail } from './mailbox';
import { stubTurnstile } from './turnstile';

const apiUrl = process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';

/** Unique per run: the local database keeps accounts between runs. */
function newPlayer() {
  const id = `${String(Date.now()).slice(-7)}${String(Math.floor(Math.random() * 100))}`;
  return {
    email: `e2e-${id}@example.com`,
    name: `Jugador ${id}`,
    password: 'clave-de-prueba-larga',
  };
}

test.beforeEach(async ({ page }) => {
  await stubTurnstile(page);
});

// Acceptance test from the GDD (D05): sign up, verify the email, sign in and sign out.
test('a person signs up, verifies the email, signs out and signs in again', async ({ page }) => {
  const player = newPlayer();

  await page.goto('/');
  await page.getByRole('link', { name: 'Elegir mi país' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Crea tu ciudadano' })).toBeVisible();
  await page.getByLabel('Correo').fill(player.email);
  await page.getByLabel('Contraseña', { exact: true }).fill(player.password);
  await page.getByLabel('Nombre de tu ciudadano').fill(player.name);
  await expect(page.getByText('Disponible. No podrás cambiarlo después.')).toBeVisible();
  await page.getByRole('radio', { name: 'Argentina' }).click();
  await expectNoA11yViolations(page);
  await page.getByRole('button', { name: 'Crear mi ciudadano' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Confirma tu correo' })).toBeVisible();
  await expect(page.getByText(player.email)).toBeVisible();
  await expectNoA11yViolations(page);

  await page.goto(await linkFromLatestEmail(player.email));
  await expect(page.getByRole('heading', { level: 1, name: player.name })).toBeVisible();
  await expect(page.getByText('Ciudadanía: Argentina')).toBeVisible();
  await expectNoA11yViolations(page);

  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'El mundo está cambiando' }),
  ).toBeVisible();

  await page
    .getByRole('navigation', { name: 'Principal' })
    .getByRole('link', { name: 'Iniciar sesión' })
    .click();
  await page.getByLabel('Correo').fill(player.email);
  await page.getByLabel('Contraseña', { exact: true }).fill(player.password);
  await expectNoA11yViolations(page);
  await page.getByRole('button', { name: 'Entrar a Concordia' }).click();
  await expect(page.getByRole('heading', { level: 1, name: player.name })).toBeVisible();
});

test('a person who forgot the password gets back in with a new one', async ({
  page,
  request,
  baseURL,
}) => {
  const player = newPlayer();
  // An already confirmed account, created through the API with the test token.
  const signUp = await request.post(`${apiUrl}/auth/v1/signup`, {
    params: { redirect_to: baseURL ?? '' },
    headers: { apikey: publishableKey },
    data: {
      email: player.email,
      password: player.password,
      data: { citizen_name: player.name, country_code: 'ESP', locale: 'es' },
      gotrue_meta_security: { captcha_token: 'XXXX.DUMMY.TOKEN.XXXX' },
    },
  });
  expect(signUp.ok()).toBe(true);
  await page.goto(await linkFromLatestEmail(player.email));
  await expect(page.getByRole('heading', { level: 1, name: player.name })).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();

  await page.goto('/sign-in');
  await page.getByRole('link', { name: 'Olvidé mi contraseña' }).click();
  await page.getByLabel('Correo').fill(player.email);
  await page.getByRole('button', { name: 'Enviarme el enlace' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Revisa tu correo' })).toBeVisible();
  await expectNoA11yViolations(page);

  await page.goto(await linkFromLatestEmail(player.email, 'recovery'));
  await expect(
    page.getByRole('heading', { level: 1, name: 'Crea una contraseña nueva' }),
  ).toBeVisible();
  await page.getByLabel('Contraseña nueva').fill('otra-clave-de-prueba');
  await page.getByLabel('Repite la contraseña').fill('otra-clave-de-prueba');
  await page.getByRole('button', { name: 'Guardar contraseña' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Ya puedes entrar' })).toBeVisible();
  await page.getByRole('link', { name: 'Entrar a Concordia' }).click();
  await expect(page.getByRole('heading', { level: 1, name: player.name })).toBeVisible();
});

// Acceptance test from the GDD (D05): a sign-up without Turnstile is rejected.
test('Auth rejects a sign-up without a Turnstile token', async ({ request }) => {
  test.skip(
    process.env.E2E_CAPTCHA_DISABLED === 'true',
    'Local Auth runs without CAPTCHA when it cannot reach Cloudflare (docs/runbook.md).',
  );
  const player = newPlayer();
  const response = await request.post(`${apiUrl}/auth/v1/signup`, {
    headers: { apikey: publishableKey },
    data: {
      email: player.email,
      password: player.password,
      data: { citizen_name: player.name, country_code: 'ARG', locale: 'es' },
    },
  });
  expect(response.status()).toBe(400);
  expect(((await response.json()) as { error_code: string }).error_code).toBe('captcha_failed');
});
