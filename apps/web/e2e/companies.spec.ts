import { expect, test } from '@playwright/test';

import { expectNoA11yViolations } from './a11y';
import { sql } from './db';
import { createConfirmedPlayer, signIn } from './players';
import { stubTurnstile } from './turnstile';

test('an owner founds and funds a company, and an employee works and is paid net of tax', async ({
  page,
  request,
}) => {
  await stubTurnstile(page);
  const owner = await createConfirmedPlayer(request, 'ARG');
  const worker = await createConfirmedPlayer(request, 'ARG');
  // Founding costs 20 Gold; a new citizen has 5.
  await sql(
    `select game.transfer(game.system_account('issuer', 'GOLD'), game.citizen_account($1, 'GOLD'), 2000, 'test', null)`,
    [owner.id],
  );
  const name = `Molinos ${owner.name.slice(-6)}`;

  await signIn(page, owner);
  await page.goto('/companies/new');
  await page.getByLabel('Nombre de la empresa').fill(name);
  await page.getByRole('button', { name: 'Fundar empresa' }).click();
  await expect(page.getByText(new RegExp(`${name} ya produce en`))).toBeVisible();
  await expectNoA11yViolations(page);

  await page.getByRole('link', { name: 'Administrar la empresa' }).click();
  await page.getByLabel('Importe').fill('42');
  await page.getByRole('button', { name: 'Poner en la caja' }).click();
  await expect(page.getByText('Listo.')).toBeVisible();
  await page.getByLabel('Salario para todos').fill('42');
  await page.getByLabel('Vacantes').fill('1');
  await page.getByRole('button', { name: 'Publicar oferta' }).click();
  await expect(page.getByText('Oferta publicada.')).toBeVisible();
  await expectNoA11yViolations(page);

  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await signIn(page, worker);
  await page.goto('/work');
  await page.getByRole('button', { name: `Tomar empleo en ${name}` }).click();
  await expect(page.getByRole('heading', { level: 2, name })).toBeVisible();
  await page.getByRole('button', { name: 'Trabajar' }).click();
  await expect(page.getByText('Cobraste 36,96')).toBeVisible();
  await expectNoA11yViolations(page);

  const [row] = await sql<{ balance: string }>(
    `select balance from game.accounts where kind = 'citizen' and user_id = $1 and currency_code = 'ARG'`,
    [worker.id],
  );
  expect(row?.balance).toBe(String(5000 + 3696));
});
