import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Job, JobOffer, Workday } from '../../features/economy/queries';
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

const job: Job = {
  company_id: 7,
  company_name: 'Molinos del Litoral',
  good_code: 'wheat',
  region_code: 'ARG-01',
  owner_name: 'Lucía Ferraro',
  wage: 4200,
  work_tax: 0.12,
  streak: 5,
  worked_today: false,
  hired_at: '2026-10-01T12:00:00Z',
  next_change_at: '2026-10-02T12:00:00Z',
};

const offer: JobOffer = {
  company_id: 9,
  name: 'Armería Rosarina',
  good_code: 'weapon_q4',
  region_code: 'ARG-05',
  wage: 4600,
  vacancies: 2,
  owner_name: 'Diego Paz',
};

const workday: Workday = {
  company_id: 7,
  gross: 4200,
  tax: 504,
  net: 3696,
  produced: 5,
  good_code: 'wheat',
};

type Answers = Parameters<typeof answerRpc>[0];

function signIn(extra: Answers = {}) {
  answerRpc({
    get_my_citizen: { data: [citizenRow()], error: null },
    get_my_profile: { data: [profileRow()], error: null },
    get_my_balances: { data: balanceRows, error: null },
    get_my_job: { data: [job], error: null },
    get_my_workday: { data: [], error: null },
    list_job_offers: { data: [offer], error: null },
    list_my_companies: { data: [], error: null },
    list_countries: { data: countryRows, error: null },
    list_regions: { data: regionRows, error: null },
    ...extra,
  });
  setSession(fakeSession());
}

describe('work', () => {
  afterEach(() => {
    resetSupabaseMock();
    localStorage.clear();
  });

  it('shows the job and today’s payslip with the work tax', async () => {
    signIn();
    await renderRoute('/work');
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Molinos del Litoral' }),
    ).toBeVisible();
    expect(
      await screen.findByText('Buenos Aires · Trigo · Propiedad de Lucía Ferraro'),
    ).toBeVisible();
    const payslip = screen.getByRole('region', { name: 'Si trabajas hoy' });
    expect(within(payslip).getByText('42,00')).toBeVisible();
    expect(within(payslip).getByText('Impuesto al trabajo, 12 %')).toBeVisible();
    expect(within(payslip).getByText('−5,04')).toBeVisible();
    expect(within(payslip).getByText('36,96')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Empleo' })).toHaveAttribute('aria-current', 'page');
  });

  it('works once with an idempotency key and shows what was collected', async () => {
    const user = userEvent.setup();
    let worked = false;
    signIn({
      work: (args) => {
        expect(args).toEqual({ p_key: expect.stringMatching(/^[0-9a-f-]{36}$/) as unknown });
        worked = true;
        return { data: [{ ...workday, energy: 90 }], error: null };
      },
      get_my_workday: () => ({ data: worked ? [workday] : [], error: null }),
    });
    await renderRoute('/work');
    await user.click(await screen.findByRole('button', { name: 'Trabajar' }));
    expect(await screen.findByText('Cobraste 36,96')).toBeVisible();
    expect(screen.getByRole('heading', { level: 2, name: 'Ya trabajaste hoy' })).toBeVisible();
    expect(screen.getByText('La empresa produjo 5 de Trigo.')).toBeVisible();
  });

  it('explains why a workday was refused', async () => {
    const user = userEvent.setup();
    signIn({ work: { data: null, error: { message: 'company_cannot_pay' } } });
    await renderRoute('/work');
    await user.click(await screen.findByRole('button', { name: 'Trabajar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La empresa no tiene caja para pagarte hoy.',
    );
  });

  it('lists the offers of the player’s country and takes one', async () => {
    const user = userEvent.setup();
    signIn({ get_my_job: { data: [], error: null }, take_job: { data: null, error: null } });
    await renderRoute('/work');
    expect(
      await screen.findByText('Todavía no tienes empleo. Elige una oferta de tu país.'),
    ).toBeVisible();
    const offers = await screen.findByRole('table', { name: 'Ofertas de empleo en Argentina' });
    expect(within(offers).getByText('Armas Q4')).toBeVisible();
    expect(within(offers).getByText('46,00')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Tomar empleo en Armería Rosarina' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('take_job', { p_company_id: 9 });
  });

  it('speaks English', async () => {
    signIn();
    await renderRoute('/work', 'en');
    expect(await screen.findByRole('heading', { level: 1, name: 'Job' })).toBeVisible();
    expect(await screen.findByText('Work tax, 12%')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Work' })).toBeVisible();
  });
});
