import { expect, test } from '@playwright/test';

import { expectNoA11yViolations } from './a11y';
import { sql } from './db';
import { createConfirmedPlayer, signIn } from './players';
import { stubTurnstile } from './turnstile';

// R7 acceptance: a citizen works → produces a kit → sells → another buys → consumes; the ledger balances.
test('a maker produces kits, sells one, and the buyer heals with it', async ({ page, request }) => {
  await stubTurnstile(page);
  const maker = await createConfirmedPlayer(request, 'ARG');
  const buyer = await createConfirmedPlayer(request, 'ARG');
  // Founding has its own test (companies.spec.ts): here the kit maker and its medical raw are set up directly.
  const name = `Botiquines ${maker.name.slice(-6)}`;
  const [company] = await sql<{ id: string }>(
    `insert into game.companies (name, owner_user_id, country_code, region_code, good_code, created_at)
     values ($1, $2, 'ARG', 'ARG-01', 'kit_q1', now()) returning id`,
    [name, maker.id],
  );
  await sql(
    `select game.put_goods(game.holder_for_company($1), 'medical_raw', 'ARG', 200, 'test', 'e2e')`,
    [company?.id],
  );

  // Work: the owner's management shift turns raw material into kits.
  await signIn(page, maker);
  await page.goto('/work');
  await page.getByRole('button', { name: `Trabajar en ${name}` }).click();
  await expect(page.getByText(/La empresa produjo \d+ de Botiquines Q1\./)).toBeVisible();
  await expectNoA11yViolations(page);

  // Sell: five kits from the depot at 8.00.
  await page.goto('/market/sell');
  await page.getByLabel('Qué vendes').selectOption(`company:${String(company?.id)}:kit_q1`);
  await page.getByLabel('Cantidad').fill('5');
  await page.getByLabel('Precio por unidad').fill('8,00');
  await page.getByRole('button', { name: 'Publicar oferta' }).click();
  await expect(page.getByText('Tu oferta ya está publicada.')).toBeVisible();

  // Buy: another citizen buys one.
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await signIn(page, buyer);
  await page.goto('/market');
  await page.getByRole('button', { name: /^Botiquines Q1 desde 8,00/ }).click();
  const purchase = page.getByRole('region', { name: 'Comprar Botiquines Q1' });
  await purchase.getByRole('button', { name: 'Comprar 1' }).click();
  await expect(page.getByText('Compraste 1 de Botiquines Q1 por 8,00 Crédito.')).toBeVisible();

  // Consume: hurt (nothing hurts in Stage 1 yet), the buyer uses the kit and heals 5.
  await sql('update game.player_stats set health = 40 where user_id = $1', [buyer.id]);
  await page.goto('/account');
  await page.getByRole('button', { name: 'Usar uno de Botiquines Q1' }).click();
  await expect(page.getByText('Recuperaste 5 de salud. Ahora tienes 45.')).toBeVisible();
  await expectNoA11yViolations(page);

  // The ledger balances in every currency.
  const unbalanced = await sql(
    'select currency_code from game.accounts group by currency_code having sum(balance) <> 0',
  );
  expect(unbalanced).toHaveLength(0);
});
