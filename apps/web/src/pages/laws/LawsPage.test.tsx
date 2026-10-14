import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Bill, Decree } from '../../features/politics/queries';
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

const taxes: Bill = {
  bill_id: 4,
  kind: 'taxes',
  title: 'IVA al 7 %',
  body: '',
  terms: { vat: 0.07 },
  majority: 'simple',
  proposed_by_name: 'Elena Sosa',
  proposer_office: 'congress',
  members: 4,
  opened_at: '2026-11-07T10:00:00Z',
  closes_at: '2099-11-08T10:00:00Z',
  status: 'voting',
  yes: 1,
  no: 1,
  abstain: 0,
  tiebreak: null,
  failure: null,
  my_vote: null,
};

const transfer: Bill = {
  ...taxes,
  bill_id: 5,
  kind: 'gold_transfer',
  title: 'Ayuda a Uruguay',
  terms: { country_code: 'URY', amount: 2000 },
  proposed_by_name: 'Camila Ríos',
  proposer_office: 'president',
  status: 'not_executed',
  closes_at: '2026-11-08T10:00:00Z',
  yes: 3,
  no: 0,
  failure: 'country_inactive',
};

const decree: Decree = {
  decree_id: 1,
  title: 'Decreto 1',
  body: 'Se establece el día del ciudadano.',
  issued_by_name: 'Camila Ríos',
  issued_at: '2026-11-07T12:00:00Z',
};

type Answers = Parameters<typeof answerRpc>[0];

function signIn(office: string | null, initiative: unknown[], extra: Answers = {}) {
  answerRpc({
    get_my_citizen: { data: [citizenRow()], error: null },
    get_my_profile: { data: [profileRow()], error: null },
    get_my_balances: { data: balanceRows, error: null },
    get_my_office: { data: office ? [{ office, country_code: 'ARG' }] : [], error: null },
    get_my_initiative: { data: initiative, error: null },
    list_bills: { data: [taxes, transfer], error: null },
    list_decrees: { data: [decree], error: null },
    list_countries: { data: countryRows, error: null },
    list_regions: { data: regionRows, error: null },
    ...extra,
  });
  setSession(fakeSession());
}

describe('laws', () => {
  afterEach(() => {
    resetSupabaseMock();
    localStorage.clear();
  });

  it('shows bills with their terms and outcome, and lets a member of Congress vote', async () => {
    const user = userEvent.setup();
    signIn('congress', [{ office: 'congress', used: 1, allowed: 3 }], {
      vote_bill: { data: null, error: null },
    });
    await renderRoute('/laws');
    const bills = await screen.findByRole('region', { name: 'Proyectos' });
    expect(await within(bills).findByText(/IVA: 7 %/)).toBeVisible();
    expect(within(bills).getByText(/Aprobada, pero no se pudo ejecutar/)).toBeVisible();
    expect(screen.getByText(/Puedes presentar 2 proyectos más en este mandato/)).toBeVisible();
    await user.click(within(bills).getByRole('button', { name: 'En contra: IVA al 7 %' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('vote_bill', { p_bill_id: 4, p_choice: 'no' });
    expect(await within(bills).findByText('Tu voto quedó registrado.')).toBeVisible();
  });

  it('lets the president present a tax bill', async () => {
    const user = userEvent.setup();
    signIn('president', [{ office: 'president', used: 4, allowed: null }], {
      propose_bill: { data: 9, error: null },
    });
    await renderRoute('/laws');
    const form = await screen.findByRole('region', { name: 'Presentar un proyecto' });
    await user.selectOptions(within(form).getByLabelText('Tipo'), 'taxes');
    await user.type(within(form).getByLabelText('Título'), 'Arancel bajo');
    await user.type(within(form).getByLabelText('Arancel (%)'), '5');
    await user.click(within(form).getByRole('button', { name: 'Presentar' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('propose_bill', {
      p_kind: 'taxes',
      p_title: 'Arancel bajo',
      p_body: '',
      p_terms: { tariff: 0.05 },
      p_key: expect.any(String) as string,
    });
    expect(
      await within(form).findByText('El proyecto está en votación durante 24 horas.'),
    ).toBeVisible();
    expect(screen.getByRole('region', { name: 'Decretos' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Firmar' })).toBeVisible();
  });

  it('lets the vice president break a tie but not vote', async () => {
    const user = userEvent.setup();
    signIn('vice_president', [], { break_tie: { data: null, error: null } });
    await renderRoute('/laws');
    const bills = await screen.findByRole('region', { name: 'Proyectos' });
    expect(within(bills).queryByRole('button', { name: 'A favor: IVA al 7 %' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Presentar un proyecto' })).toBeNull();
    await user.click(
      await within(bills).findByRole('button', { name: 'Desempatar a favor: IVA al 7 %' }),
    );
    expect(supabaseMock.rpc).toHaveBeenCalledWith('break_tie', { p_bill_id: 4, p_choice: 'yes' });
    expect(await within(bills).findByText('Tu desempate quedó registrado.')).toBeVisible();
  });
});
