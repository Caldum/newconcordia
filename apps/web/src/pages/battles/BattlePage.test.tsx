import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Battle, BattleRow } from '../../features/war/queries';
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

const region = regionRows[0]?.code ?? 'ARG-01';

const row: BattleRow = {
  battle_id: 3,
  region_code: region,
  kind: 'war',
  attacker_country_code: 'BRA',
  defender_country_code: 'ARG',
  started_at: '2026-11-08T12:00:00Z',
  current_round: 2,
  attacker_rounds: 1,
  defender_rounds: 0,
  status: 'active',
  winner: null,
  finished_at: null,
};

const battle: Battle = {
  ...row,
  round_ends_at: '2099-11-08T14:00:00Z',
  attacker_damage: 120,
  defender_damage: 80,
  my_side_order: false,
};

function signIn(office: string | null, extra: Parameters<typeof answerRpc>[0] = {}) {
  answerRpc({
    get_my_citizen: { data: [citizenRow()], error: null },
    get_my_profile: { data: [profileRow()], error: null },
    get_my_balances: { data: balanceRows, error: null },
    get_my_office: { data: office ? [{ office, country_code: 'ARG' }] : [], error: null },
    list_battles: { data: [row], error: null },
    get_battle: { data: [battle], error: null },
    list_battle_rounds: {
      data: [{ round_no: 1, attacker_damage: 300, defender_damage: 200, winner: 'attacker' }],
      error: null,
    },
    battle_ranking: { data: [], error: null },
    get_my_weapon: { data: [], error: null },
    get_my_inventory: { data: [{ good_code: 'weapon_q2', quantity: 1 }], error: null },
    list_war_authorizations: { data: [], error: null },
    list_launch_targets: { data: [], error: null },
    list_occupied_regions: {
      data: [
        {
          region_code: region,
          restore_country_code: 'ARG',
          occupier_country_code: 'BRA',
          organizers: 3,
          needed: 10,
          battle_id: null,
          i_organize: false,
        },
      ],
      error: null,
    },
    list_countries: { data: countryRows, error: null },
    list_regions: { data: regionRows, error: null },
    ...extra,
  });
  setSession(fakeSession());
}

describe('battles', () => {
  afterEach(() => {
    resetSupabaseMock();
    localStorage.clear();
  });

  it('lists the battles with their score and links to each one', async () => {
    signIn(null);
    await renderRoute('/battles');
    const list = await screen.findByRole('region', { name: 'En curso y recientes' });
    expect(await within(list).findByText(/Rondas 1 a 0 · Ronda 2 de 9/)).toBeVisible();
    expect(within(list).getByRole('link', { name: 'Ver la batalla' })).toHaveAttribute(
      'href',
      '/battles/3',
    );
    expect(screen.queryByRole('region', { name: 'Lanzar una ofensiva' })).toBeNull();
    const resistance = screen.getByRole('region', { name: 'Resistencia' });
    expect(await within(resistance).findByText('3 de 10 organizadores')).toBeVisible();
  });

  it('shows the live score and attacks for a side', async () => {
    const user = userEvent.setup();
    signIn(null, {
      attack: {
        data: [
          {
            damage: 10,
            military_xp: 15,
            civil_xp: 15,
            energy: 90,
            health: 100,
            health_lost: 0,
            weapon_uses_left: 0,
          },
        ],
        error: null,
      },
      equip_weapon: { data: 2, error: null },
    });
    await renderRoute('/battles/3');
    const score = await screen.findByRole('region', { name: /Ronda 2 en curso/ });
    expect(within(score).getByText(/120 de daño/)).toBeVisible();
    const rounds = screen.getByRole('region', { name: 'Rondas' });
    expect(await within(rounds).findByText(/Ronda 1: 300 a 200 · Atacante/)).toBeVisible();
    const fight = screen.getByRole('region', { name: 'Combatir' });
    await user.click(within(fight).getByRole('button', { name: /Atacar por Argentina/ }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('attack', {
      p_battle_id: 3,
      p_side: 'defender',
      p_key: expect.any(String) as string,
    });
    expect(
      await within(fight).findByText('Hiciste 10 de daño y ganaste 15 de experiencia.'),
    ).toBeVisible();
    const weapon = screen.getByRole('region', { name: 'Arma' });
    await user.click(await within(weapon).findByRole('button', { name: 'Equipar Armas Q2' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('equip_weapon', { p_good_code: 'weapon_q2' });
  });
});
