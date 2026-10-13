import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { citizenRow } from '../../test/fixtures/citizen';
import { balanceRows } from '../../test/fixtures/ledger';
import { profileRow } from '../../test/fixtures/profile';
import { countryRows, regionRows } from '../../test/fixtures/world';
import { renderRoute } from '../../test/renderRoute';
import { answerRpc, fakeSession, resetSupabaseMock, setSession } from '../../test/supabaseMock';

vi.mock('../../lib/supabase', async () => ({
  supabase: (await import('../../test/supabaseMock')).supabaseMock,
}));

const effects = ['food_q1', 'weapon_q3', 'kit_q2', 'military_raw'].map((code) => ({
  code,
  damage_multiplier: code === 'weapon_q3' ? 1.6 : null,
  energy: code === 'food_q1' ? 10 : null,
  heal: code === 'kit_q2' ? 10 : null,
  food_energy_per_interval: 10,
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
        { good_code: 'food_q1', quantity: 18 },
        { good_code: 'kit_q2', quantity: 3 },
        { good_code: 'military_raw', quantity: 2.5 },
        { good_code: 'weapon_q3', quantity: 24 },
      ],
      error: null,
    },
    list_goods_effects: { data: effects, error: null },
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
    expect(await within(items).findByText('Da 10 de energía.')).toBeVisible();
    expect(
      within(items).getByText('Multiplica tu daño ×1,6. Se gasta una por golpe.'),
    ).toBeVisible();
    expect(within(items).getByText('Comida Q1')).toBeVisible();
    expect(within(items).getByText('Botiquines Q2')).toBeVisible();
    expect(within(items).getByText('Cura 10 de salud.')).toBeVisible();
    expect(within(items).getByText('Materia prima militar')).toBeVisible();
    expect(within(items).getByText('2,5')).toBeVisible();
    expect(
      within(items).getByText(
        'Comes automáticamente: cada 5 minutos, si te falta energía, comes la comida de menor calidad que alcance y recuperas hasta 10.',
      ),
    ).toBeVisible();
  });

  it('says food is eaten automatically, and says nothing about it without food', async () => {
    signIn({ get_my_inventory: { data: [{ good_code: 'weapon_q3', quantity: 2 }], error: null } });
    await renderRoute('/account');
    const items = await screen.findByRole('region', { name: 'Objetos' });
    expect(await within(items).findByText('Armas Q3')).toBeVisible();
    expect(within(items).queryByText(/Comes automáticamente/)).not.toBeInTheDocument();
  });
});
