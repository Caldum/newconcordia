import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { MarketOffer, MarketSummary } from '../../features/market/queries';
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

const policy = { vat: 0.05, tariff: 0.1, fee: 0.01 };
const summary: MarketSummary[] = [
  { good_code: 'ration', best_price: 1260, average_24h: 1300, offers: 2, ...policy },
  { good_code: 'wheat', best_price: null, average_24h: null, offers: 0, ...policy },
];
const offers: MarketOffer[] = [
  {
    offer_id: 1,
    seller_name: 'Cocina de Campaña',
    origin_country_code: 'ARG',
    quantity: 10,
    price: 1260,
    imported: false,
    tariff: 0.1,
  },
  {
    offer_id: 2,
    seller_name: 'Gastronomía Ibérica',
    origin_country_code: 'ESP',
    quantity: 5,
    price: 1300,
    imported: true,
    tariff: 0.1,
  },
];

type Answers = Parameters<typeof answerRpc>[0];

function signIn(extra: Answers = {}) {
  answerRpc({
    get_my_citizen: { data: [citizenRow()], error: null },
    get_my_profile: { data: [profileRow()], error: null },
    get_my_balances: { data: balanceRows, error: null },
    market_summary: { data: summary, error: null },
    list_market: { data: offers, error: null },
    list_my_companies: { data: [], error: null },
    get_my_inventory: { data: [{ good_code: 'ration', quantity: 18 }], error: null },
    list_my_offers: { data: [], error: null },
    list_countries: { data: countryRows, error: null },
    list_regions: { data: regionRows, error: null },
    ...extra,
  });
  setSession(fakeSession());
}

describe('market', () => {
  afterEach(() => {
    resetSupabaseMock();
    localStorage.clear();
  });

  it('shows the goods, the offers cheapest first and the VAT included', async () => {
    signIn();
    await renderRoute('/market');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Mercado de Argentina' }),
    ).toBeVisible();
    expect(
      screen.getByText(
        'Precios en Crédito con IVA 5 % incluido. Los productos importados pagan además 10 % de arancel.',
      ),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: /Raciones desde 12,60/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /Trigo sin ofertas/ })).toBeVisible();
    const table = await screen.findByRole('table', { name: 'Ofertas de Raciones' });
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    expect(
      screen.getByText('Promedio de las últimas 24 h: 13,00. El vendedor paga 1 % de comisión.'),
    ).toBeVisible();
  });

  it('buys with the tariff on imports and an idempotency key', async () => {
    const user = userEvent.setup();
    signIn({ buy: { data: 2860, error: null } });
    await renderRoute('/market');
    await user.click(
      await screen.findByRole('button', { name: 'Elegir la oferta de Gastronomía Ibérica' }),
    );
    const purchase = screen.getByRole('region', { name: 'Comprar Raciones' });
    const quantity = within(purchase).getByLabelText('Cantidad');
    await user.clear(quantity);
    await user.type(quantity, '2');
    expect(within(purchase).getByText('Arancel por importación, 10 %')).toBeVisible();
    expect(within(purchase).getByText('28,60')).toBeVisible();
    await user.click(within(purchase).getByRole('button', { name: 'Comprar 2' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('buy', {
      p_offer_id: 2,
      p_quantity: 2,
      p_key: expect.stringMatching(/^[0-9a-f-]{36}$/) as unknown,
    });
    expect(await screen.findByText('Compraste 2 de Raciones por 28,60 Crédito.')).toBeVisible();
  });

  it('explains a purchase the buyer cannot pay', async () => {
    const user = userEvent.setup();
    signIn({ buy: { data: null, error: { message: 'insufficient_funds' } } });
    await renderRoute('/market');
    await user.click(await screen.findByRole('button', { name: 'Comprar 1' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No te alcanza el Crédito para esta compra.',
    );
  });
});

describe('sell', () => {
  afterEach(() => {
    resetSupabaseMock();
    localStorage.clear();
  });

  it('shows what the seller receives after VAT and fee, and publishes', async () => {
    const user = userEvent.setup();
    signIn({ post_offer: { data: 9, error: null } });
    await renderRoute('/market/sell');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Vender en el mercado' }),
    ).toBeVisible();
    expect(
      await screen.findByRole('option', { name: 'Raciones · 18 en tu inventario' }),
    ).toBeVisible();
    const quantity = screen.getByLabelText('Cantidad');
    await user.clear(quantity);
    await user.type(quantity, '10');
    await user.type(screen.getByLabelText('Precio por unidad'), '12,60');
    expect(screen.getByText('126,00')).toBeVisible();
    expect(screen.getByText('−6,00')).toBeVisible();
    expect(screen.getByText('−1,26')).toBeVisible();
    expect(screen.getByText('118,74')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Publicar oferta' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('post_offer', {
      p_good_code: 'ration',
      p_quantity: 10,
      p_price: 1260,
      p_market_country_code: 'ARG',
      p_key: expect.stringMatching(/^[0-9a-f-]{36}$/) as unknown,
    });
    expect(await screen.findByText('Tu oferta ya está publicada.')).toBeVisible();
  });

  it('refuses more units than the player holds', async () => {
    const user = userEvent.setup();
    signIn();
    await renderRoute('/market/sell');
    const quantity = await screen.findByLabelText('Cantidad');
    await user.clear(quantity);
    await user.type(quantity, '19');
    await user.type(screen.getByLabelText('Precio por unidad'), '12');
    await user.click(screen.getByRole('button', { name: 'Publicar oferta' }));
    expect(screen.getByText('Escribe una cantidad entera, mayor que cero.')).toBeVisible();
    expect(supabaseMock.rpc).not.toHaveBeenCalledWith('post_offer', expect.anything());
  });
});
