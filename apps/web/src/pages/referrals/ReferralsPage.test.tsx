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

const base = {
  avatar_path: null,
  country_code: 'ARG',
  joined_at: '2026-11-07T09:00:00Z',
  earning_until: '2026-12-07T09:00:00Z',
  claim_until: '2027-01-06T09:00:00Z',
};

describe('referrals', () => {
  afterEach(() => {
    resetSupabaseMock();
    localStorage.clear();
  });

  it('shows each referral’s share and claims what is claimable', async () => {
    const user = userEvent.setup();
    answerRpc({
      get_my_citizen: { data: [citizenRow()], error: null },
      get_my_profile: { data: [profileRow()], error: null },
      list_my_referral_rewards: {
        data: [
          {
            ...base,
            name: 'Bea Lima',
            gold_earned: 300,
            gold_bought: 100,
            due: 40,
            claimed: 0,
            claimable: 40,
            status: 'earning',
          },
          {
            ...base,
            name: 'Juan Pérez',
            gold_earned: 1000,
            gold_bought: 0,
            due: 100,
            claimed: 100,
            claimable: 0,
            status: 'done',
          },
        ],
        error: null,
      },
      claim_referral_rewards: { data: 40, error: null },
      list_countries: { data: countryRows, error: null },
      list_regions: { data: regionRows, error: null },
    });
    setSession(fakeSession());
    await renderRoute('/referrals');
    expect(await screen.findByRole('heading', { level: 1, name: 'Referidos' })).toBeVisible();
    const summary = await screen.findByRole('region', { name: 'Tu oro por referidos' });
    expect(within(summary).getByText('0,40')).toBeVisible();
    expect(within(summary).getByText('1,40')).toBeVisible();
    expect(within(summary).getByText('El próximo vence el 6 de enero de 2027.')).toBeVisible();

    const list = screen.getByRole('region', { name: 'Tus referidos · 2' });
    expect(within(list).getByText(/Ganó 3,00 y compró 1,00 de oro neto/)).toBeVisible();
    expect(within(list).getByText(/Sumando hasta el 7 de diciembre de 2026/)).toBeVisible();
    expect(within(list).getByText(/Todo reclamado/)).toBeVisible();

    await user.click(within(summary).getByRole('button', { name: 'Reclamar 0,40 de oro' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('claim_referral_rewards');
    expect(await within(summary).findByText('Reclamaste 0,40 de oro.')).toBeVisible();
  });
});
