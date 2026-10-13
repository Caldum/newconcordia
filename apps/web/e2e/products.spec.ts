import { expect, test } from '@playwright/test';

import { expectNoA11yViolations } from './a11y';
import { sql } from './db';
import { createConfirmedPlayer, signIn } from './players';
import { stubTurnstile } from './turnstile';

test('food is eaten automatically while the player is away', async ({ page, request }) => {
  await stubTurnstile(page);
  const player = await createConfirmedPlayer(request, 'ARG');
  // The sign-up grant brings 10 Q1 food. Spend 50 energy, then pretend the last three 5-minute intervals
  // were never settled: arriving catches them up, one Q1 food (+10) each.
  await sql('select game.spend_energy($1, 50)', [player.id]);
  await sql(
    `update game.player_stats set food_at = food_at - interval '15 minutes' where user_id = $1`,
    [player.id],
  );

  await signIn(page, player);
  // Three meals; a fourth if the clock crossed into a new interval meanwhile.
  await expect(page.getByRole('meter', { name: 'Energía' })).toHaveAttribute(
    'aria-valuetext',
    /^(80|90) de 100$/,
  );
  await page.goto('/account');
  const items = page.getByRole('region', { name: 'Objetos' });
  await expect(items).toContainText('Comes automáticamente');
  await expect(items).toContainText(/Comida Q1\s*(7|6)/);
  await expectNoA11yViolations(page);
});
