import { expect, test } from '@playwright/test';

import { expectNoA11yViolations } from './a11y';
import { sql } from './db';
import { createConfirmedPlayer, signIn } from './players';
import { stubTurnstile } from './turnstile';

test('a seller posts rations and a buyer buys them; the money adds up', async ({
  page,
  request,
}) => {
  await stubTurnstile(page);
  const seller = await createConfirmedPlayer(request, 'ARG');
  const buyer = await createConfirmedPlayer(request, 'ARG');
  await sql(
    `insert into game.inventories (user_id, good_code, quantity) values ($1, 'ration', 10)`,
    [seller.id],
  );

  await signIn(page, seller);
  await page.goto('/market/sell');
  await page.getByLabel('Cantidad').fill('10');
  await page.getByLabel('Precio por unidad').fill('2,00');
  await page.getByRole('button', { name: 'Publicar oferta' }).click();
  await expect(page.getByText('Tu oferta ya está publicada.')).toBeVisible();
  await expectNoA11yViolations(page);

  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await signIn(page, buyer);
  await page.goto('/market');
  const purchase = page.getByRole('region', { name: 'Comprar Raciones' });
  await purchase.getByLabel('Cantidad').fill('3');
  await purchase.getByRole('button', { name: 'Comprar 3' }).click();
  await expect(page.getByText('Compraste 3 de Raciones por 6,00 Crédito.')).toBeVisible();
  await expectNoA11yViolations(page);

  // 6.00 paid: 0.29 VAT to the treasury, 0.06 fee out of the game, 5.65 to the seller.
  const [balances] = await sql<{ buyer: string; seller: string }>(
    `select (select balance from game.accounts where kind = 'citizen' and user_id = $1 and currency_code = 'ARG') as buyer,
            (select balance from game.accounts where kind = 'citizen' and user_id = $2 and currency_code = 'ARG') as seller`,
    [buyer.id, seller.id],
  );
  expect(balances?.buyer).toBe(String(5000 - 600));
  expect(balances?.seller).toBe(String(5000 + 565));
});
