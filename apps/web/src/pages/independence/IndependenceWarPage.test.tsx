import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { citizenRow } from '../../test/fixtures/citizen';
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

const war = {
  war_id: 4,
  damage_target: 10_000,
  damage_total: 2_500,
  started_at: '2026-11-07T10:00:00Z',
  ends_at: '2099-11-14T10:00:00Z',
  status: 'active',
  hero_name: null,
};

function signIn(extra: Parameters<typeof answerRpc>[0] = {}) {
  answerRpc({
    list_countries: { data: countryRows, error: null },
    list_regions: { data: regionRows, error: null },
    get_my_citizen: { data: [citizenRow()], error: null },
    get_my_profile: { data: [profileRow()], error: null },
    get_my_weapon: { data: [], error: null },
    get_independence_war: { data: [war], error: null },
    independence_feed: {
      data: [
        {
          attack_id: 9,
          name: 'Bot Belgrano',
          damage: 14,
          health_lost: 3,
          created_at: '2026-11-07T10:05:00Z',
        },
        {
          attack_id: 8,
          name: 'Camila Ríos',
          damage: 12,
          health_lost: 0,
          created_at: '2026-11-07T10:04:00Z',
        },
      ],
      error: null,
    },
    independence_pulse: { data: [], error: null },
    independence_ranking: {
      data: [
        { name: 'Bot Belgrano', damage: 140, attacks: 10 },
        { name: 'Camila Ríos', damage: 12, attacks: 1 },
      ],
      error: null,
    },
    get_my_independence: {
      data: [{ damage: 12, strikes: 1, place: 2, fighters: 21 }],
      error: null,
    },
    ...extra,
  });
  setSession(fakeSession());
}

describe('the independence war, live', () => {
  afterEach(() => {
    resetSupabaseMock();
    localStorage.clear();
  });

  it('shows the board, the latest strikes, my share and the heroes', async () => {
    signIn();
    await renderRoute('/battles/independence');
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Guerra de independencia de Argentina',
      }),
    ).toBeVisible();
    expect(screen.getByText('En vivo')).toBeVisible();
    expect(
      await screen.findByRole('group', { name: /Argentina lleva el 25 % de la meta/ }),
    ).toBeVisible();
    expect(screen.getAllByText(/^2.?500 de 10.000 de daño$/).length).toBeGreaterThan(0);

    const feed = screen.getByRole('region', { name: 'Últimos golpes' });
    const strikes = await within(feed).findAllByRole('listitem');
    expect(strikes[0]).toHaveTextContent('Bot Belgrano');
    expect(strikes[0]).toHaveTextContent('−3 salud');
    expect(strikes[1]).toHaveTextContent('Tú');

    const mine = screen.getByRole('region', { name: 'Tu parte' });
    expect(await within(mine).findByText('2 de 21')).toBeVisible();
    const heroes = screen.getByRole('region', { name: 'Héroes de la guerra' });
    expect(await within(heroes).findByText('Bot Belgrano')).toBeVisible();
    expect(screen.getByRole('region', { name: 'Ritmo de la batalla' })).toBeVisible();
  });

  it('strikes five times in a row with a key for each strike', async () => {
    const user = userEvent.setup();
    signIn({
      independence_attack: {
        data: [
          {
            damage: 20,
            military_xp: 20,
            energy: 70,
            health: 85,
            health_lost: 0,
            war_status: 'active',
          },
        ],
        error: null,
      },
    });
    await renderRoute('/battles/independence');
    const panel = await screen.findByRole('region', { name: 'Tu golpe por Argentina' });
    await user.click(await within(panel).findByRole('button', { name: '5 golpes seguidos' }));
    expect(await within(panel).findByText('5 golpes, 100 de daño.')).toBeVisible();
    const calls = supabaseMock.rpc.mock.calls.filter(([name]) => name === 'independence_attack');
    expect(calls).toHaveLength(5);
    const keys = new Set(calls.map(([, args]) => (args as { p_key: string }).p_key));
    expect(keys.size).toBe(5);
  });

  it('stops a burst at the first refusal and says why', async () => {
    const user = userEvent.setup();
    let left = 2;
    signIn({
      independence_attack: () =>
        left-- > 0
          ? {
              data: [
                {
                  damage: 20,
                  military_xp: 20,
                  energy: 10,
                  health: 85,
                  health_lost: 0,
                  war_status: 'active',
                },
              ],
              error: null,
            }
          : { data: null, error: { message: 'not_enough_energy' } },
    });
    await renderRoute('/battles/independence');
    const panel = await screen.findByRole('region', { name: 'Tu golpe por Argentina' });
    await user.click(await within(panel).findByRole('button', { name: '5 golpes seguidos' }));
    expect(await within(panel).findByText('2 golpes, 40 de daño.')).toBeVisible();
    expect(within(panel).getByText('Paraste antes: Necesitas 10 de energía.')).toBeVisible();
  });

  it('says so when the country has no war', async () => {
    signIn({ get_independence_war: { data: [], error: null } });
    await renderRoute('/battles/independence');
    expect(
      await screen.findByText('Tu país no tiene una guerra de independencia en curso.'),
    ).toBeVisible();
  });
});
