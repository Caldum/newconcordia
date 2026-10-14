import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { MarketLicense, MarketSummary } from '../../features/market/queries';
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

const summary: MarketSummary[] = [
  {
    good_code: 'food_q1',
    best_price: 1260,
    average_24h: null,
    offers: 1,
    vat: 0.05,
    tariff: 0.1,
    fee: 0.01,
    export_tax: 0.2,
  },
];

type Answers = Parameters<typeof answerRpc>[0];

function signIn(licenses: MarketLicense[], extra: Answers = {}) {
  answerRpc({
    get_my_citizen: { data: [citizenRow()], error: null },
    get_my_profile: { data: [profileRow()], error: null },
    get_my_balances: { data: balanceRows, error: null },
    get_market_license_terms: {
      data: [{ price: 1000, country_share: 500, required: true }],
      error: null,
    },
    list_my_market_licenses: { data: licenses, error: null },
    market_summary: { data: summary, error: null },
    list_my_companies: { data: [], error: null },
    get_my_inventory: { data: [{ good_code: 'food_q1', quantity: 18 }], error: null },
    list_my_offers: { data: [], error: null },
    list_countries: { data: countryRows, error: null },
    list_regions: { data: regionRows, error: null },
    ...extra,
  });
  setSession(fakeSession());
}

describe('market licenses', () => {
  afterEach(() => {
    resetSupabaseMock();
    localStorage.clear();
  });

  it('explains the price and buys a license for a country in play', async () => {
    const user = userEvent.setup();
    signIn([], { buy_market_license: { data: 1, error: null } });
    await renderRoute('/market/licenses');
    expect(
      await screen.findByText(
        'Cada licencia cuesta 10 Oro: 5 van al tesoro de ese país y 5 salen del juego.',
      ),
    ).toBeVisible();
    expect(
      screen.getByText('Todavía no tienes licencias. Solo comercias en tu país.'),
    ).toBeVisible();
    // Uruguay is not in play and Argentina is the player's own market: only Spain is offered.
    expect(await screen.findByRole('option', { name: 'España' })).toBeVisible();
    expect(screen.queryByRole('option', { name: 'Uruguay' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Comprar por 10 Oro' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('buy_market_license', {
      p_market_country_code: 'ESP',
      p_key: expect.stringMatching(/^[0-9a-f-]{36}$/) as unknown,
    });
    expect(await screen.findByText('Ya puedes comerciar en el mercado de España.')).toBeVisible();
  });

  it('explains a license the player cannot pay', async () => {
    const user = userEvent.setup();
    signIn([], {
      buy_market_license: { data: null, error: { message: 'insufficient_funds' } },
    });
    await renderRoute('/market/licenses');
    await user.click(await screen.findByRole('button', { name: 'Comprar por 10 Oro' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No te alcanza el Oro para esta licencia.',
    );
  });

  it('with a license, sells abroad showing the export tax', async () => {
    const user = userEvent.setup();
    signIn([{ market_country_code: 'ESP', granted_at: '2026-10-14T15:00:00Z' }], {
      post_offer: { data: 9, error: null },
    });
    await renderRoute('/market/sell');
    await user.selectOptions(await screen.findByRole('combobox', { name: 'Mercado' }), 'ESP');
    await user.clear(screen.getByLabelText('Cantidad'));
    await user.type(screen.getByLabelText('Cantidad'), '5');
    await user.type(screen.getByLabelText('Precio por unidad'), '10');
    expect(screen.getByText('Impuesto a la exportación, 20 %')).toBeVisible();
    expect(screen.getByText('−9,42')).toBeVisible();
    expect(screen.getByText('37,70')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Publicar oferta' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith(
      'post_offer',
      expect.objectContaining({ p_market_country_code: 'ESP' }),
    );
  });
});
