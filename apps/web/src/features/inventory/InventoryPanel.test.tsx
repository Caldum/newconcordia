import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { citizenRow } from '../../test/fixtures/citizen';
import { balanceRows } from '../../test/fixtures/ledger';
import { profileRow } from '../../test/fixtures/profile';
import { countryRows, regionRows } from '../../test/fixtures/world';
import { renderRoute } from '../../test/renderRoute';
import {
  answerRpc,
  fakeSession,
  resetSupabaseMock,
  setSession,
  supabaseMock,
} from '../../test/supabaseMock';

vi.mock('../../lib/supabase', async () => ({
  supabase: (await import('../../test/supabaseMock')).supabaseMock,
}));

const effects = ['ration', 'weapon_q3', 'fuel', 'wheat'].map((code) => ({
  code,
  damage_multiplier: code === 'weapon_q3' ? 1.6 : null,
  ration_energy: 10,
  food_energy_daily_max: 200,
}));

type Answers = Parameters<typeof answerRpc>[0];

function signIn(extra: Answers = {}) {
  answerRpc({
    get_my_citizen: { data: [citizenRow()], error: null },
    get_my_profile: { data: [profileRow()], error: null },
    get_my_balances: { data: balanceRows, error: null },
    list_my_movements: { data: [], error: null },
    get_my_inventory: {
      data: [
        { good_code: 'ration', quantity: 18 },
        { good_code: 'weapon_q3', quantity: 24 },
        { good_code: 'wheat', quantity: 2.5 },
      ],
      error: null,
    },
    list_goods_effects: { data: effects, error: null },
    get_my_food_today: { data: 40, error: null },
    list_countries: { data: countryRows, error: null },
    list_regions: { data: regionRows, error: null },
    ...extra,
  });
  setSession(fakeSession());
}

describe('inventory', () => {
  afterEach(() => {
    resetSupabaseMock();
    localStorage.clear();
  });

  it('lists the goods with what each is for', async () => {
    signIn();
    await renderRoute('/account');
    const items = await screen.findByRole('region', { name: 'Objetos' });
    expect(
      await within(items).findByText('Recupera 10 de energía, hasta 200 por día.'),
    ).toBeVisible();
    expect(
      within(items).getByText('Multiplica tu daño ×1,6. Se gasta una por golpe.'),
    ).toBeVisible();
    expect(within(items).getByText('2,5')).toBeVisible();
    expect(await within(items).findByText('Hoy recuperaste 40 de 200.')).toBeVisible();
  });

  it('eats rations with an idempotency key', async () => {
    const user = userEvent.setup();
    signIn({
      eat_rations: {
        data: [{ energy_gained: 30, energy: 110, food_energy_today: 70 }],
        error: null,
      },
    });
    await renderRoute('/account');
    const field = await screen.findByLabelText('Raciones a comer');
    await user.clear(field);
    await user.type(field, '3');
    await user.click(screen.getByRole('button', { name: 'Comer' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('eat_rations', {
      p_quantity: 3,
      p_key: expect.stringMatching(/^[0-9a-f-]{36}$/) as unknown,
    });
    expect(await screen.findByText('Recuperaste 30 de energía.')).toBeVisible();
  });

  it('explains the daily food limit', async () => {
    const user = userEvent.setup();
    signIn({ eat_rations: { data: null, error: { message: 'food_limit' } } });
    await renderRoute('/account');
    await user.click(await screen.findByRole('button', { name: 'Comer' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Con eso pasarías el máximo de energía por comida de hoy.',
    );
  });
});
