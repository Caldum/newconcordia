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

function signIn(enabled = true) {
  answerRpc({
    get_my_citizen: { data: [citizenRow()], error: null },
    get_my_profile: { data: [profileRow()], error: null },
    get_travel_terms: {
      data: [
        {
          enabled,
          gold_per_km: 0.0001,
          currency_code: 'ARG',
          rate: 500,
          rate_from_market: false,
          region_code: 'ARG-01',
        },
      ],
      error: null,
    },
    list_travel_destinations: {
      data: [
        { region_code: 'ARG-02', country_code: 'ARG', km: 577.8, price: 2889 },
        { region_code: 'ARG-03', country_code: 'ARG', km: 1300.2, price: 6501 },
      ],
      error: null,
    },
    travel: { data: 'ARG-03', error: null },
    list_countries: { data: countryRows, error: null },
    list_regions: { data: regionRows, error: null },
  });
  setSession(fakeSession());
}

describe('travel', () => {
  afterEach(() => {
    resetSupabaseMock();
    localStorage.clear();
  });

  it('shows where the player is and travels with the price of the distance', async () => {
    const user = userEvent.setup();
    signIn();
    await renderRoute('/travel');
    expect(await screen.findByRole('heading', { level: 1, name: 'Viajar' })).toBeVisible();
    const here = await screen.findByRole('region', { name: 'Dónde estás' });
    expect(await within(here).findByText('Buenos Aires, Argentina')).toBeVisible();
    expect(
      within(here).getByText(
        'Sin operaciones recientes en el mercado, 1 oro se toma como 500 pesos argentinos.',
      ),
    ).toBeVisible();

    const trip = await screen.findByRole('region', { name: 'Tu viaje' });
    expect(within(trip).getByText('578 km')).toBeVisible();
    expect(within(trip).getByText('28,89 pesos argentinos')).toBeVisible();
    await user.selectOptions(within(trip).getByLabelText('Destino'), 'ARG-03');
    expect(within(trip).getByText('1.300 km')).toBeVisible();
    await user.click(within(trip).getByRole('button', { name: 'Viajar' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('travel', {
      p_region_code: 'ARG-03',
      p_key: expect.any(String) as string,
    });
  });

  it('shows the location in the side panel with the way to travel', async () => {
    signIn();
    await renderRoute('/');
    const panel = await screen.findByRole('complementary', { name: 'Tu ciudadano' });
    expect(await within(panel).findByText('Buenos Aires, Argentina')).toBeVisible();
    expect(within(panel).getByRole('link', { name: 'Viajar' })).toHaveAttribute('href', '/travel');
  });

  it('says when travel is closed', async () => {
    signIn(false);
    await renderRoute('/travel');
    expect(await screen.findByText('Los viajes están cerrados por ahora.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Viajar' })).not.toBeInTheDocument();
  });
});
