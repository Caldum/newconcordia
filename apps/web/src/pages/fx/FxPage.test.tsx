import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { FxBookOffer, FxSummary } from '../../features/fx/queries';
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

const summary: FxSummary[] = [
  { currency_code: 'ARG', best_sell: 5000, best_buy: 4900, last_price: 5101, volume_24h: 900 },
];

const book: FxBookOffer[] = [
  {
    offer_id: 7,
    side: 'sell_gold',
    owner_name: 'Ana Gómez',
    is_central_bank: false,
    gold_amount: 600,
    price: 5000,
    mine: false,
  },
  {
    offer_id: 8,
    side: 'buy_gold',
    owner_name: 'ARG',
    is_central_bank: true,
    gold_amount: 500,
    price: 4900,
    mine: false,
  },
];

type Answers = Parameters<typeof answerRpc>[0];

function signIn(office: string | null, extra: Answers = {}) {
  answerRpc({
    get_my_citizen: { data: [citizenRow()], error: null },
    get_my_profile: { data: [profileRow()], error: null },
    get_my_balances: { data: balanceRows, error: null },
    get_my_office: { data: office ? [{ office, country_code: 'ARG' }] : [], error: null },
    fx_summary: { data: summary, error: null },
    fx_book: { data: book, error: null },
    list_my_fx_offers: { data: [], error: null },
    list_countries: { data: countryRows, error: null },
    list_regions: { data: regionRows, error: null },
    ...extra,
  });
  setSession(fakeSession());
}

describe('currency exchange', () => {
  afterEach(() => {
    resetSupabaseMock();
    localStorage.clear();
  });

  it('shows both sides of the book and takes part of an offer', async () => {
    const user = userEvent.setup();
    signIn(null, { fx_take: { data: 20000, error: null } });
    await renderRoute('/market/fx');
    const sells = await screen.findByRole('region', { name: 'Venden Oro' });
    expect(await within(sells).findByText(/Ana Gómez · 6,00 Oro a 50,00 por Oro/)).toBeVisible();
    const buys = screen.getByRole('region', { name: 'Compran Oro' });
    expect(within(buys).getByText(/Banco Central de Argentina · 5,00 Oro/)).toBeVisible();
    expect(screen.queryByLabelText('Operar con los fondos del Banco Central')).toBeNull();
    await user.type(within(sells).getByLabelText('Oro a tomar de la oferta de Ana Gómez'), '4');
    await user.click(within(sells).getByRole('button', { name: 'Tomar la oferta de Ana Gómez' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('fx_take', {
      p_offer_id: 7,
      p_gold_amount: 400,
      p_key: expect.any(String) as string,
      p_central_bank: false,
    });
    expect(await within(sells).findByText(/se cambiaron .*200,00/)).toBeVisible();
  });

  it('lets the governor post an offer with the Central Bank’s funds', async () => {
    const user = userEvent.setup();
    signIn('central_bank_governor', { fx_post_offer: { data: 9, error: null } });
    await renderRoute('/market/fx');
    await user.click(await screen.findByLabelText(/Operar con los fondos del Banco Central/));
    const form = screen.getByRole('region', { name: 'Publicar una oferta' });
    await user.selectOptions(within(form).getByLabelText('Quiero'), 'buy_gold');
    await user.type(within(form).getByLabelText('Oro'), '5');
    await user.type(within(form).getByLabelText('Precio por 1 Oro'), '51,01');
    expect(within(form).getByText(/Se reservan .*255,05 de la moneda/)).toBeVisible();
    await user.click(within(form).getByRole('button', { name: 'Publicar' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('fx_post_offer', {
      p_currency: 'ARG',
      p_side: 'buy_gold',
      p_gold_amount: 500,
      p_price: 5101,
      p_key: expect.any(String) as string,
      p_central_bank: true,
    });
    expect(await within(form).findByText('La oferta está publicada.')).toBeVisible();
  });
});
