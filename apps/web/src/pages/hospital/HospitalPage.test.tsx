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

const region = regionRows[0]?.code ?? 'ARG-01';

function signIn(office: string | null, extra: Parameters<typeof answerRpc>[0] = {}) {
  answerRpc({
    get_my_citizen: { data: [citizenRow()], error: null },
    get_my_profile: { data: [profileRow()], error: null },
    get_my_balances: { data: balanceRows, error: null },
    get_my_office: { data: office ? [{ office, country_code: 'ARG' }] : [], error: null },
    get_my_hospital: {
      data: [
        { region_code: region, level: 2, country_code: 'ARG', policy: 'universal', eligible: true },
      ],
      error: null,
    },
    list_hospitals: {
      data: [{ region_code: region, level: 2, built_at: '2026-11-07T10:00:00Z' }],
      error: null,
    },
    get_care_policy: {
      data: [{ policy: 'universal', set_by_name: null, set_at: null }],
      error: null,
    },
    get_hospital_stock: {
      data: [{ region_code: region, good_code: 'kit_q2', quantity: 3 }],
      error: null,
    },
    list_countries: { data: countryRows, error: null },
    list_regions: { data: regionRows, error: null },
    ...extra,
  });
  setSession(fakeSession());
}

describe('hospital', () => {
  afterEach(() => {
    resetSupabaseMock();
    localStorage.clear();
  });

  it('treats the player at the hospital of the region, without showing its stock', async () => {
    const user = userEvent.setup();
    signIn(null, {
      hospital_treatment: { data: [{ good_code: 'kit_q2', healed: 3, health: 100 }], error: null },
    });
    await renderRoute('/hospital');
    const here = await screen.findByRole('region', { name: 'El hospital de tu región' });
    expect(await within(here).findByText(/nivel 2/)).toBeVisible();
    await user.click(within(here).getByRole('button', { name: 'Pedir un tratamiento' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('hospital_treatment', {
      p_key: expect.any(String) as string,
    });
    expect(
      await within(here).findByText(
        'Usaron un Botiquines Q2: recuperaste 3 de salud y quedaste en 100.',
      ),
    ).toBeVisible();
    expect(screen.queryByRole('region', { name: 'Botiquines por hospital' })).toBeNull();
  });

  it('lets the Health minister set the care policy and see the stock', async () => {
    const user = userEvent.setup();
    signIn('minister_health', { set_care_policy: { data: null, error: null } });
    await renderRoute('/hospital');
    const health = await screen.findByRole('region', { name: 'Ministerio de Salud' });
    await user.selectOptions(within(health).getByLabelText('Atender a'), 'nationals');
    await user.click(within(health).getByRole('button', { name: 'Guardar la política' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('set_care_policy', { p_policy: 'nationals' });
    expect(await within(health).findByText('La política está vigente.')).toBeVisible();
    const stock = screen.getByRole('region', { name: 'Botiquines por hospital' });
    expect(await within(stock).findByText(/Botiquines Q2: 3/)).toBeVisible();
  });
});
