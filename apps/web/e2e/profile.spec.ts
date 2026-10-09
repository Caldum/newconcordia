import { expect, test } from '@playwright/test';

import { expectNoA11yViolations } from './a11y';
import { sql } from './db';
import { createConfirmedPlayer, signIn } from './players';
import { stubTurnstile } from './turnstile';

test('a new citizen has full energy and starts at level 1 with 100 strength', async ({
  page,
  request,
}) => {
  await stubTurnstile(page);
  const player = await createConfirmedPlayer(request, 'ARG');
  await signIn(page, player);

  const energy = page.getByRole('meter', { name: 'Energía' });
  await expect(energy).toHaveAttribute('aria-valuetext', '100 de 100');

  await page.getByRole('link', { name: `Tu perfil: ${player.name}` }).click();
  await expect(page).toHaveURL('/profile');
  await expect(page.getByRole('heading', { level: 1, name: player.name })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Nivel' })).toContainText('1');
  await expect(page.getByRole('group', { name: 'Nivel' })).toContainText('0 de 10 de experiencia');
  await expect(page.getByRole('group', { name: 'Fuerza' })).toContainText('100');
  await expect(page.getByRole('group', { name: 'Daño total' })).toContainText('Rango 0');
  await expect(page.getByRole('group', { name: 'Energía' })).toContainText('Llena');
  await expectNoA11yViolations(page);

  // An action spends energy in the database; the bar shows what is left after the next reading.
  await sql('select game.spend_energy($1, 30)', [player.id]);
  await page.reload();
  await expect(energy).toHaveAttribute('aria-valuetext', '70 de 100');
  await expect(page.getByRole('group', { name: 'Energía' })).toContainText(
    'Se recarga 10 por hora, hasta 100',
  );
});
