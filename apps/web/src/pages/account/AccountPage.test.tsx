import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { citizenRow } from '../../test/fixtures/citizen';
import { balanceRows, movementRows } from '../../test/fixtures/ledger';
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

type Answers = Parameters<typeof answerRpc>[0];

function signIn(extra: Answers = {}) {
  answerRpc({
    get_my_citizen: { data: [citizenRow()], error: null },
    get_my_profile: { data: [profileRow()], error: null },
    get_my_balances: { data: balanceRows, error: null },
    list_my_movements: (args) => {
      const currency = (args as { p_currency?: string }).p_currency;
      return {
        data: movementRows.filter(
          (row) => currency === undefined || row.currency_code === currency,
        ),
        error: null,
      };
    },
    list_countries: { data: countryRows, error: null },
    list_regions: { data: regionRows, error: null },
    ...extra,
  });
  setSession(fakeSession());
}

describe('account', () => {
  afterEach(() => {
    resetSupabaseMock();
    localStorage.clear();
  });

  it('shows Gold and Credit in the game bar and links to the account', async () => {
    signIn();
    await renderRoute('/');
    const link = await screen.findByRole('link', { name: 'Tu cuenta: Oro 1.240 y Crédito 38.450' });
    expect(link).toHaveAttribute('href', '/account');
  });

  it('shows the balances of each currency', async () => {
    signIn();
    await renderRoute('/account');
    expect(await screen.findByRole('heading', { level: 1, name: 'Tu cuenta' })).toBeVisible();
    expect(document.title).toBe('Tu cuenta · Concordia');
    const gold = await screen.findByRole('group', { name: 'Oro' });
    expect(within(gold).getByText('1.240,00')).toBeVisible();
    expect(
      within(gold).getByText('Moneda global. Vale lo mismo en todos los países.'),
    ).toBeVisible();
    const credit = await screen.findByRole('group', { name: 'Crédito de Argentina' });
    expect(within(credit).getByText('38.450,04')).toBeVisible();
    expect(
      within(screen.getByRole('group', { name: 'Crédito de España' })).getByText('12,00'),
    ).toBeVisible();
  });

  it('lists movements with their counterparty and filters them by currency', async () => {
    const user = userEvent.setup();
    signIn();
    await renderRoute('/account');
    const table = await screen.findByRole('table', { name: 'Movimientos' });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(4);
    expect(within(rows[1]!).getByText('Por las raciones')).toBeVisible();
    expect(within(rows[1]!).getByText('Marcos Villalba')).toBeVisible();
    expect(within(rows[1]!).getByText('−12,50')).toBeVisible();
    expect(within(rows[1]!).getByText('38.450,04')).toBeVisible();
    expect(within(rows[2]!).getByText('Regalo de bienvenida')).toBeVisible();
    expect(within(rows[2]!).getByText('Emisión del juego')).toBeVisible();
    expect(within(rows[2]!).getByText('+5,00 Oro')).toBeVisible();
    expect(within(rows[3]!).getByText('Emisión de Argentina')).toBeVisible();

    await user.click(screen.getByRole('tab', { name: 'Oro' }));
    expect(await screen.findByText('Emisión del juego')).toBeVisible();
    expect(
      within(screen.getByRole('table', { name: 'Movimientos' })).getAllByRole('row'),
    ).toHaveLength(2);
    expect(supabaseMock.rpc).toHaveBeenCalledWith('list_my_movements', {
      p_currency: 'GOLD',
      p_limit: 50,
    });
  });

  it('transfers to another player with an idempotency key and confirms it', async () => {
    const user = userEvent.setup();
    const transfer = vi.fn(() => ({ data: 3832504, error: null }));
    signIn({ transfer_money: transfer });
    await renderRoute('/account');
    await user.type(await screen.findByLabelText('Ciudadano que recibe'), 'Marcos Villalba');
    await user.type(screen.getByLabelText('Importe'), '12,50');
    await user.type(screen.getByLabelText('Concepto (opcional)'), 'Por las raciones');
    await user.click(screen.getByRole('button', { name: 'Transferir' }));

    expect(
      await screen.findByText('Enviaste 12,50 Crédito de Argentina a Marcos Villalba.'),
    ).toBeVisible();
    expect(transfer).toHaveBeenCalledWith({
      p_to_name: 'Marcos Villalba',
      p_currency: 'ARG',
      p_amount: 1250,
      p_memo: 'Por las raciones',
      p_key: expect.stringMatching(/^[0-9a-f-]{36}$/) as unknown,
    });
    expect(screen.getByLabelText('Importe')).toHaveValue('');
  });

  it('checks the amount before sending and explains the database refusals', async () => {
    const user = userEvent.setup();
    signIn({
      transfer_money: { data: null, error: { code: '22023', message: 'insufficient_funds' } },
    });
    await renderRoute('/account');
    await user.type(await screen.findByLabelText('Ciudadano que recibe'), 'Marcos Villalba');
    await user.type(screen.getByLabelText('Importe'), '12,505');
    await user.click(screen.getByRole('button', { name: 'Transferir' }));
    expect(
      screen.getByText('Escribe un importe mayor que cero, con hasta dos decimales: 12,50.'),
    ).toBeVisible();
    expect(supabaseMock.rpc).not.toHaveBeenCalledWith('transfer_money', expect.anything());

    await user.clear(screen.getByLabelText('Importe'));
    await user.type(screen.getByLabelText('Importe'), '99999');
    await user.click(screen.getByRole('button', { name: 'Transferir' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No te alcanza el saldo de esa moneda.',
    );
  });

  it('keeps the same key when the player retries the same transfer', async () => {
    const user = userEvent.setup();
    const keys: string[] = [];
    signIn({
      transfer_money: (args) => {
        keys.push((args as { p_key: string }).p_key);
        return { data: null, error: new Error('Failed to fetch') };
      },
    });
    await renderRoute('/account');
    await user.type(await screen.findByLabelText('Ciudadano que recibe'), 'Marcos Villalba');
    await user.type(screen.getByLabelText('Importe'), '1');
    await user.click(screen.getByRole('button', { name: 'Transferir' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo transferir.');
    await user.click(screen.getByRole('button', { name: 'Transferir' }));
    await user.type(screen.getByLabelText('Importe'), '0');
    await user.click(screen.getByRole('button', { name: 'Transferir' }));
    expect(keys).toHaveLength(3);
    expect(keys[1]).toBe(keys[0]);
    expect(keys[2]).not.toBe(keys[0]);
  });

  it('speaks English', async () => {
    signIn();
    await renderRoute('/account', 'en');
    expect(await screen.findByRole('heading', { level: 1, name: 'Your account' })).toBeVisible();
    expect(
      within(await screen.findByRole('group', { name: 'Gold' })).getByText('1,240.00'),
    ).toBeVisible();
    expect(await screen.findAllByText('Welcome gift', { selector: 'td' })).toHaveLength(2);
    expect(
      screen.getByRole('link', { name: 'Your account: Gold 1,240 and Credit 38,450' }),
    ).toBeVisible();
  });
});
