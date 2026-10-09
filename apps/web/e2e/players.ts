import { expect } from '@playwright/test';
import type { APIRequestContext, Page } from '@playwright/test';

import { sql } from './db';
import { dummyTurnstileToken } from './turnstile';

const apiUrl = process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';

export interface Player {
  email: string;
  name: string;
  password: string;
}

/** Unique per run: the local database keeps accounts between runs. */
export function newPlayer(): Player {
  const id = `${String(Date.now()).slice(-7)}${String(Math.floor(Math.random() * 100))}`;
  return {
    email: `e2e-${id}@example.com`,
    name: `Jugador ${id}`,
    password: 'clave-de-prueba-larga',
  };
}

/** Signs a player up through Auth and confirms the email directly, for journeys that start later. */
export async function createConfirmedPlayer(
  request: APIRequestContext,
  country: string,
): Promise<Player & { id: string }> {
  const player = newPlayer();
  const response = await request.post(`${apiUrl}/auth/v1/signup`, {
    headers: { apikey: publishableKey },
    data: {
      email: player.email,
      password: player.password,
      data: { citizen_name: player.name, country_code: country, locale: 'es' },
      gotrue_meta_security: { captcha_token: dummyTurnstileToken },
    },
  });
  expect(response.ok()).toBe(true);
  const [row] = await sql<{ id: string }>(
    'update auth.users set email_confirmed_at = now() where email = $1 returning id',
    [player.email],
  );
  if (!row) throw new Error(`No account for ${player.email}`);
  return { ...player, id: row.id };
}

export async function signIn(page: Page, player: Player): Promise<void> {
  await page.goto('/sign-in');
  await page.getByLabel('Correo').fill(player.email);
  await page.getByLabel('Contraseña', { exact: true }).fill(player.password);
  await page.getByRole('button', { name: 'Entrar a Concordia' }).click();
  await expect(page.getByRole('heading', { level: 1, name: player.name })).toBeVisible();
}
