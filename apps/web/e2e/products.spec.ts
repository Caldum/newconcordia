import { expect, test } from '@playwright/test';

import { expectNoA11yViolations } from './a11y';
import { sql } from './db';
import { createConfirmedPlayer, signIn } from './players';
import { stubTurnstile } from './turnstile';

test('a player eats Q1 food and the energy rises in the bar', async ({ page, request }) => {
  await stubTurnstile(page);
  const player = await createConfirmedPlayer(request, 'ARG');
  // The sign-up grant brings 10 Q1 food.
  await sql('select game.spend_energy($1, 50)', [player.id]);

  await signIn(page, player);
  await page.goto('/account');
  const items = page.getByRole('region', { name: 'Objetos' });
  await expect(items).toContainText('Hoy recuperaste 0 de 200.');
  await items.getByLabel('Comida Q1 a comer').fill('3');
  await items.getByRole('button', { name: 'Comer' }).click();
  await expect(page.getByText('Recuperaste 30 de energía.')).toBeVisible();
  await expect(page.getByRole('meter', { name: 'Energía' })).toHaveAttribute(
    'aria-valuetext',
    '80 de 100',
  );
  await expect(items).toContainText('Hoy recuperaste 30 de 200.');
  await expectNoA11yViolations(page);
});
