import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PublicFunds, PublicMovement } from '../../features/finance/queries';
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

const funds: PublicFunds[] = [
  { institution: 'treasury', currency_code: 'GOLD', balance: 7000, held: 3000 },
  { institution: 'treasury', currency_code: 'ARG', balance: 250000, held: 0 },
  { institution: 'health', currency_code: 'GOLD', balance: 3000, held: 0 },
  { institution: 'health', currency_code: 'ARG', balance: 47000, held: 0 },
];

const payment: PublicMovement = {
  posting_id: 40,
  created_at: '2026-11-08T11:00:00Z',
  institution: 'health',
  kind: 'ministry_payment',
  memo: 'Beca de estudio',
  currency_code: 'ARG',
  amount: -1000,
  counterparty_kind: 'citizen',
  counterparty_name: 'Elena Sosa',
  ordered_by: 'Juan Pérez',
};

type Answers = Parameters<typeof answerRpc>[0];

function signIn(office: string | null, extra: Answers = {}) {
  answerRpc({
    get_my_citizen: { data: [citizenRow()], error: null },
    get_my_profile: { data: [profileRow()], error: null },
    get_my_balances: { data: balanceRows, error: null },
    get_my_office: { data: office ? [{ office, country_code: 'ARG' }] : [], error: null },
    get_public_finances: { data: funds, error: null },
    list_public_movements: { data: [payment], error: null },
    get_ministry_stock: {
      data: [{ good_code: 'kit_q1', origin_country_code: 'ARG', quantity: 4 }],
      error: null,
    },
    list_market: { data: [], error: null },
    list_countries: { data: countryRows, error: null },
    list_regions: { data: regionRows, error: null },
    ...extra,
  });
  setSession(fakeSession());
}

describe('public finances', () => {
  afterEach(() => {
    resetSupabaseMock();
    localStorage.clear();
  });

  it('shows funds and every movement to anyone, without private stock', async () => {
    signIn(null);
    await renderRoute('/finances');
    const fundsPanel = await screen.findByRole('region', { name: 'Fondos' });
    expect(await within(fundsPanel).findByText('Ministerio de Salud')).toBeVisible();
    expect(within(fundsPanel).getByText(/30,00 reservado/)).toBeVisible();
    const movements = screen.getByRole('region', { name: 'Movimientos' });
    expect(await within(movements).findByText('Pago ministerial')).toBeVisible();
    expect(within(movements).getByText('Beca de estudio')).toBeVisible();
    expect(within(movements).getByText('Juan Pérez')).toBeVisible();
    expect(screen.queryByRole('region', { name: /Inventario/ })).toBeNull();
    expect(supabaseMock.rpc).not.toHaveBeenCalledWith('get_ministry_stock', expect.anything());
  });

  it('lets the Health minister pay and see the ministry stock', async () => {
    const user = userEvent.setup();
    signIn('minister_health', { ministry_pay: { data: 41, error: null } });
    await renderRoute('/finances');
    const ministry = await screen.findByRole('region', {
      name: 'Tu ministerio: Ministerio de Salud',
    });
    await user.type(within(ministry).getByLabelText('Monto'), '10');
    await user.type(within(ministry).getByLabelText('Ciudadano'), 'Elena Sosa');
    await user.type(within(ministry).getByLabelText('Concepto'), 'Beca de estudio');
    await user.click(within(ministry).getByRole('button', { name: 'Pagar' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('ministry_pay', {
      p_currency: 'ARG',
      p_amount: 1000,
      p_citizen_name: 'Elena Sosa',
      p_concept: 'Beca de estudio',
      p_key: expect.any(String) as string,
    });
    expect(await within(ministry).findByText(/Pagaste .*10,00.* a Elena Sosa\./)).toBeVisible();
    const stock = screen.getByRole('region', { name: 'Inventario del Ministerio de Salud' });
    expect(await within(stock).findByText('Botiquines Q1')).toBeVisible();
  });
});
