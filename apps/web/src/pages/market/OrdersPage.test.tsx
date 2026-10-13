import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { BuyOrder, MarketSummary, MyBuyOrder } from '../../features/market/queries';
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
  { good_code: 'food_q1', best_price: 1260, average_24h: 1300, offers: 2, ...policy },
  { good_code: 'kit_q1', best_price: null, average_24h: null, offers: 0, ...policy },
];
const book: BuyOrder[] = [
  { order_id: 4, buyer_name: 'Marcos Villalba', remaining: 6, limit_price: 1280 },
  { order_id: 3, buyer_name: 'Hospital de Mendoza', remaining: 20, limit_price: 1250 },
];
const mine: MyBuyOrder[] = [
  {
    order_id: 7,
    market_country_code: 'ARG',
    good_code: 'food_q1',
    company_name: null,
    quantity: 10,
    remaining: 6,
    limit_price: 1300,
    held: 7800,
    status: 'partial',
    created_at: '2026-10-14T15:00:00Z',
  },
];

type Answers = Parameters<typeof answerRpc>[0];

function signIn(extra: Answers = {}) {
  answerRpc({
    get_my_citizen: { data: [citizenRow()], error: null },
    get_my_profile: { data: [profileRow()], error: null },
    get_my_balances: { data: balanceRows, error: null },
    market_summary: { data: summary, error: null },
    list_buy_orders: { data: book, error: null },
    list_my_buy_orders: { data: mine, error: null },
    list_my_companies: { data: [], error: null },
    list_countries: { data: countryRows, error: null },
    list_regions: { data: regionRows, error: null },
    ...extra,
  });
  setSession(fakeSession());
}

describe('buy orders', () => {
  afterEach(() => {
    resetSupabaseMock();
    localStorage.clear();
  });

  it('shows who buys, highest first, and the own orders with what they hold', async () => {
    signIn();
    await renderRoute('/market/orders');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Órdenes de compra' }),
    ).toBeVisible();
    const table = await screen.findByRole('table', { name: 'Quién compra Comida Q1' });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(rows[1]).toHaveTextContent('Marcos Villalba612,80');
    expect(
      await screen.findByText('Comida Q1: faltan 6 de 10, hasta 13,00 por unidad'),
    ).toBeVisible();
    expect(screen.getByText('78,00 reservados')).toBeVisible();
  });

  it('holds limit × quantity and posts the order with an idempotency key', async () => {
    const user = userEvent.setup();
    signIn({ post_buy_order: { data: 9, error: null } });
    await renderRoute('/market/orders');
    const quantity = await screen.findByLabelText('Cantidad');
    await user.clear(quantity);
    await user.type(quantity, '10');
    await user.type(screen.getByLabelText('Precio máximo por unidad'), '13');
    expect(screen.getByText('130,00')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Publicar orden' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('post_buy_order', {
      p_good_code: 'food_q1',
      p_quantity: 10,
      p_limit_price: 1300,
      p_market_country_code: 'ARG',
      p_key: expect.stringMatching(/^[0-9a-f-]{36}$/) as unknown,
    });
    expect(await screen.findByText(/Orden publicada/)).toBeVisible();
  });

  it('explains an order the player cannot hold', async () => {
    const user = userEvent.setup();
    signIn({ post_buy_order: { data: null, error: { message: 'insufficient_funds' } } });
    await renderRoute('/market/orders');
    await user.type(await screen.findByLabelText('Precio máximo por unidad'), '13');
    await user.click(screen.getByRole('button', { name: 'Publicar orden' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No te alcanza el Crédito para reservar esta orden.',
    );
  });

  it('refuses a missing price without calling the database', async () => {
    const user = userEvent.setup();
    signIn();
    await renderRoute('/market/orders');
    await user.click(await screen.findByRole('button', { name: 'Publicar orden' }));
    expect(screen.getByText('Escribe un precio mayor que cero, por ejemplo 12,50.')).toBeVisible();
    expect(supabaseMock.rpc).not.toHaveBeenCalledWith('post_buy_order', expect.anything());
  });

  it('cancels an order', async () => {
    const user = userEvent.setup();
    signIn({ cancel_buy_order: { data: null, error: null } });
    await renderRoute('/market/orders');
    await user.click(await screen.findByRole('button', { name: 'Cancelar la orden de Comida Q1' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('cancel_buy_order', { p_order_id: 7 });
    expect(
      await screen.findByText('Orden cancelada. El dinero reservado volvió a tu saldo.'),
    ).toBeVisible();
  });
});
