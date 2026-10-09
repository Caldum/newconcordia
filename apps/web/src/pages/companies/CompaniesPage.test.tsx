import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Company } from '../../features/economy/queries';
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

const workshop: Company = {
  id: 3,
  name: 'Taller Ríos',
  good_code: 'weapon_q3',
  region_code: 'ARG-01',
  level: 1,
  capacity: 10,
  wage: 4600,
  vacancies: 1,
  cash: 218000,
  employees: 1,
  points: 4,
  created_at: '2026-08-29T12:00:00Z',
  next_level_gold: 30,
  next_quality_gold: 60,
};

type Answers = Parameters<typeof answerRpc>[0];

function signIn(extra: Answers = {}) {
  answerRpc({
    get_my_citizen: { data: [citizenRow()], error: null },
    get_my_profile: { data: [profileRow()], error: null },
    get_my_balances: { data: balanceRows, error: null },
    list_my_companies: { data: [workshop], error: null },
    get_company_employees: {
      data: [
        { name: 'Martín Acosta', hired_at: '2026-09-01T12:00:00Z', worked_today: true, streak: 23 },
      ],
      error: null,
    },
    get_company_stock: {
      data: [
        { good_code: 'iron', quantity: 36 },
        { good_code: 'weapon_q3', quantity: 42 },
      ],
      error: null,
    },
    list_countries: { data: countryRows, error: null },
    list_regions: { data: regionRows, error: null },
    ...extra,
  });
  setSession(fakeSession());
}

describe('companies', () => {
  afterEach(() => {
    resetSupabaseMock();
    localStorage.clear();
  });

  it('shows each company with its cash, employees, depot and upgrades', async () => {
    signIn();
    await renderRoute('/companies');
    const company = await screen.findByRole('region', { name: 'Taller Ríos' });
    expect(within(company).getByText('2.180,00')).toBeVisible();
    expect(within(company).getByText('Alcanza para 47 jornadas.')).toBeVisible();
    expect(await within(company).findByText('Martín Acosta')).toBeVisible();
    expect(within(company).getByText('Trabajó')).toBeVisible();
    expect(await within(company).findByText('42')).toBeVisible();
    expect(within(company).getByText('4 puntos esperan insumos.')).toBeVisible();
    expect(
      within(company).getByRole('button', { name: 'Mejorar a nivel 2 por 30 Oro' }),
    ).toBeVisible();
    expect(within(company).getByRole('button', { name: 'Mejorar a Q4 por 60 Oro' })).toBeVisible();
  });

  it('moves Credit into the cash with an idempotency key', async () => {
    const user = userEvent.setup();
    signIn({ fund_company: { data: 228000, error: null } });
    await renderRoute('/companies');
    await user.type(await screen.findByLabelText('Importe'), '100');
    await user.click(screen.getByRole('button', { name: 'Poner en la caja' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('fund_company', {
      p_company_id: 3,
      p_amount: 10000,
      p_key: expect.stringMatching(/^[0-9a-f-]{36}$/) as unknown,
    });
    expect(await screen.findByText('Listo.')).toBeVisible();
  });

  it('publishes the offer and explains a wage below the minimum', async () => {
    const user = userEvent.setup();
    signIn({ set_company_offer: { data: null, error: { message: 'wage_below_minimum' } } });
    await renderRoute('/companies');
    const wage = await screen.findByLabelText('Salario para todos');
    expect(wage).toHaveValue('46,00');
    await user.clear(wage);
    await user.type(wage, '10');
    await user.click(screen.getByRole('button', { name: 'Publicar oferta' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('set_company_offer', {
      p_company_id: 3,
      p_wage: 1000,
      p_vacancies: 1,
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El salario está por debajo del mínimo que fija la ley de tu país.',
    );
  });

  it('invites to found the first company', async () => {
    signIn({ list_my_companies: { data: [], error: null } });
    await renderRoute('/companies');
    expect(await screen.findByText('Todavía no tienes empresas.')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Fundar una empresa' })).toHaveAttribute(
      'href',
      '/companies/new',
    );
  });
});

describe('found a company', () => {
  afterEach(() => {
    resetSupabaseMock();
    localStorage.clear();
  });

  it('founds a company in a region of the player’s country', async () => {
    const user = userEvent.setup();
    signIn({ found_company: { data: 11, error: null } });
    await renderRoute('/companies/new');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Fundar una empresa' }),
    ).toBeVisible();
    await user.click(screen.getByRole('radio', { name: /Raciones/ }));
    expect(await screen.findByText('5 raciones')).toBeVisible();
    await user.type(screen.getByLabelText('Nombre de la empresa'), 'Cocina de Campaña');
    await user.click(screen.getByRole('button', { name: 'Fundar empresa' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('found_company', {
      p_name: 'Cocina de Campaña',
      p_good_code: 'ration',
      p_region_code: 'ARG-01',
      p_key: expect.stringMatching(/^[0-9a-f-]{36}$/) as unknown,
    });
    expect(await screen.findByText(/Cocina de Campaña ya produce en Buenos Aires/)).toBeVisible();
  });

  it('asks for a name and explains the Gold it costs', async () => {
    const user = userEvent.setup();
    signIn({ found_company: { data: null, error: { message: 'insufficient_funds' } } });
    await renderRoute('/companies/new');
    await user.click(await screen.findByRole('button', { name: 'Fundar empresa' }));
    expect(screen.getByText('Escribe un nombre de 3 a 40 caracteres.')).toBeVisible();
    await user.type(screen.getByLabelText('Nombre de la empresa'), 'Molinos');
    await user.click(screen.getByRole('button', { name: 'Fundar empresa' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Fundar cuesta 20 Oro y no te alcanza.',
    );
  });
});
