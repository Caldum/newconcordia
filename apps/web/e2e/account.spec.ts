import { expect, test } from '@playwright/test';

import { expectNoA11yViolations } from './a11y';
import { sql } from './db';
import { createConfirmedPlayer, signIn } from './players';
import { stubTurnstile } from './turnstile';

test('a citizen sends Credit to another and both statements show it', async ({ page, request }) => {
  await stubTurnstile(page);
  const sender = await createConfirmedPlayer(request, 'ARG');
  const recipient = await createConfirmedPlayer(request, 'ARG');
  await signIn(page, sender);

  // The welcome grant: 5 Gold and 50 Credit.
  await page.getByRole('link', { name: 'Tu cuenta: Oro 5 y Crédito 50' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Inventario y cuenta' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Crédito de Argentina' })).toContainText('50,00');

  await page.getByLabel('Ciudadano que recibe').fill(recipient.name);
  await page.getByLabel('Importe').fill('12,50');
  await page.getByLabel('Concepto (opcional)').fill('Por las raciones');
  await page.getByRole('button', { name: 'Transferir' }).click();
  await expect(
    page.getByText(`Enviaste 12,50 Crédito de Argentina a ${recipient.name}.`),
  ).toBeVisible();
  await expect(page.getByRole('group', { name: 'Crédito de Argentina' })).toContainText('37,50');

  const table = page.getByRole('table', { name: 'Movimientos' });
  await expect(table.getByRole('row').nth(1)).toContainText('Por las raciones');
  await expect(table.getByRole('row').nth(1)).toContainText(recipient.name);
  await expect(table.getByRole('row').nth(1)).toContainText('−12,50');
  await expectNoA11yViolations(page);

  const [row] = await sql<{ balance: string }>(
    `select balance from game.accounts where kind = 'citizen' and user_id = $1 and currency_code = 'ARG'`,
    [recipient.id],
  );
  expect(row?.balance).toBe('6250');
});
