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

const policy = { vat: 0.05, tariff: 0.1, fee: 0.01, export_tax: 0 };
const summary: MarketSummary[] = [
  { good_code: 'food_q1', best_price: 1260, average_24h: 1300, offers: 2, ...policy },
  { good_code: 'food_raw', best_price: null, average_24h: null, offers: 0, ...policy },
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
    get_my_inventory: { data: [{ good_code: 'food_q1', quantity: 18 }], error: null },
    list_my_offers: { data: [], error: null },
    list_my_market_licenses: { data: [], error: null },
    list_countries: { data: countryRows, error: null },
    list_regions: { data: regionRows, error: null },
    get_my_office: { data: [], error: null },
    ...extra,
  });
  setSession(fakeSession());
}

describe('the market square', () => {
  afterEach(() => {
    resetSupabaseMock();
    localStorage.clear();
  });

  it('shows the market of the country the player is in, on food Q1, without figures', async () => {
    signIn();
    await renderRoute('/market');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Plaza del mercado' }),
    ).toBeVisible();
    expect(
      await screen.findByText(
        'Estás en Argentina y compras en su mercado. Precios en Crédito con IVA 5 % incluido; los importados pagan además 10 % de arancel. Para comprar en otro país, viaja.',
      ),
    ).toBeVisible();
    const category = screen.getByRole('group', { name: 'Categoría' });
    expect(within(category).getByRole('button', { name: 'Alimentos' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const quality = screen.getByRole('group', { name: 'Calidad' });
    expect(within(quality).getByRole('button', { name: 'Q1' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(quality).queryByRole('button', { name: /Todas/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    const table = await screen.findByRole('table', { name: 'Ofertas de Comida Q1' });
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    expect(screen.getByText('2 ofertas encontradas')).toBeVisible();
    expect(supabaseMock.rpc).toHaveBeenCalledWith('list_market', {
      p_country_code: 'ARG',
      p_good_code: 'food_q1',
    });
    expect(screen.queryByRole('region', { name: /Cifras del mercado/ })).not.toBeInTheDocument();
    expect(supabaseMock.rpc).not.toHaveBeenCalledWith('market_stats', expect.anything());
  });

  it('switches to another category on its first quality', async () => {
    const user = userEvent.setup();
    signIn();
    await renderRoute('/market');
    await user.click(await screen.findByRole('button', { name: 'Armas' }));
    expect(await screen.findByRole('table', { name: 'Ofertas de Armas Q1' })).toBeVisible();
    expect(supabaseMock.rpc).toHaveBeenCalledWith('list_market', {
      p_country_code: 'ARG',
      p_good_code: 'weapon_q1',
    });
  });

  it('builds a ticket from several offers and buys it all at once', async () => {
    const user = userEvent.setup();
    signIn({ buy_ticket: { data: 4120, error: null } });
    await renderRoute('/market');
    await user.click(
      await screen.findByRole('button', { name: 'Una unidad más de Gastronomía Ibérica' }),
    );
    await user.click(screen.getByRole('button', { name: 'Una unidad más de Gastronomía Ibérica' }));
    await user.click(screen.getByRole('button', { name: 'Una unidad más de Cocina de Campaña' }));
    const ticket = screen.getByRole('region', { name: 'Tu ticket' });
    expect(within(ticket).getByText('2 × 13,00, a Gastronomía Ibérica')).toBeVisible();
    expect(within(ticket).getByText('1 × 12,60, a Cocina de Campaña')).toBeVisible();
    expect(within(ticket).getByText('Arancel por importación, 10 %')).toBeVisible();
    expect(within(ticket).getByText('41,20')).toBeVisible();
    await user.click(within(ticket).getByRole('button', { name: 'Comprar 3 unidades' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('buy_ticket', {
      p_lines: [
        { offer_id: 2, quantity: 2 },
        { offer_id: 1, quantity: 1 },
      ],
      p_key: expect.stringMatching(/^[0-9a-f-]{36}$/) as unknown,
    });
    expect(
      await within(ticket).findByText('Compraste 3 unidades por 41,20 Crédito.'),
    ).toBeVisible();
    expect(within(ticket).queryByRole('button', { name: /Comprar/ })).not.toBeInTheDocument();
  });

  it('takes a line out of the ticket', async () => {
    const user = userEvent.setup();
    signIn();
    await renderRoute('/market');
    await user.click(
      await screen.findByRole('button', { name: 'Una unidad más de Cocina de Campaña' }),
    );
    const ticket = screen.getByRole('region', { name: 'Tu ticket' });
    await user.click(
      within(ticket).getByRole('button', { name: 'Quitar Comida Q1 de Cocina de Campaña' }),
    );
    expect(
      within(ticket).getByText(/Elige cantidades en las ofertas y se suman aquí/),
    ).toBeVisible();
    expect(screen.getByLabelText('Unidades a comprar a Cocina de Campaña')).toHaveValue('0');
  });

  it('explains that buying elsewhere needs travelling', async () => {
    const user = userEvent.setup();
    signIn({ buy_ticket: { data: null, error: { message: 'not_in_market_country' } } });
    await renderRoute('/market');
    await user.click(
      await screen.findByRole('button', { name: 'Una unidad más de Cocina de Campaña' }),
    );
    await user.click(screen.getByRole('button', { name: 'Comprar 1 unidad' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Solo compras en el mercado del país donde estás. Viaja para comprar en otro.',
    );
  });

  it('shows the figures to the minister of the economy', async () => {
    signIn({
      get_my_office: { data: [{ office: 'minister_economy', country_code: 'ARG' }], error: null },
      market_stats: {
        data: [
          {
            volume_24h: 108400,
            volume_prev_24h: 100000,
            trades_24h: 40,
            average_ticket_24h: 2710,
            average_ticket_prev_24h: 2768,
            active_offers: 1248,
            offers_today: 126,
          },
        ],
        error: null,
      },
    });
    await renderRoute('/market');
    const stats = await screen.findByRole('region', { name: 'Cifras del mercado de Argentina' });
    expect(within(stats).getByText('1.084,00')).toBeVisible();
    expect(within(stats).getByText('+8,4 %')).toBeVisible();
    expect(within(stats).getByText('27,10')).toBeVisible();
    expect(within(stats).getByText('−2,1 %')).toBeVisible();
    expect(within(stats).getByText('1.248')).toBeVisible();
    expect(within(stats).getByText('+126 hoy')).toBeVisible();
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
      await screen.findByRole('option', { name: 'Comida Q1 · 18 en tu inventario' }),
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
      p_good_code: 'food_q1',
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
