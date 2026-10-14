import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CabinetSeat, Motion } from '../../features/politics/queries';
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

const cabinet: CabinetSeat[] = [
  {
    office: 'president',
    name: 'Camila Ríos',
    party_name: 'Frente Federal',
    since: '2026-11-06T12:00:00Z',
  },
  {
    office: 'minister_economy',
    name: 'Pedro Gil',
    party_name: null,
    since: '2026-11-07T10:00:00Z',
  },
];

const impeachment: Motion = {
  motion_id: 9,
  kind: 'impeachment',
  target_name: 'Camila Ríos',
  target_office: 'president',
  proposed_by_name: 'Marcos Villalba',
  members: 3,
  opened_at: '2026-11-09T10:00:00Z',
  closes_at: '2099-11-10T10:00:00Z',
  status: 'open',
  yes: 1,
  no: 0,
  abstain: 0,
  my_vote: null,
};

type Answers = Parameters<typeof answerRpc>[0];

function signIn(office: string | null, extra: Answers = {}) {
  answerRpc({
    get_my_citizen: { data: [citizenRow()], error: null },
    get_my_profile: { data: [profileRow()], error: null },
    get_my_balances: { data: balanceRows, error: null },
    get_cabinet: { data: cabinet, error: null },
    get_my_office: { data: office ? [{ office, country_code: 'ARG' }] : [], error: null },
    list_motions: { data: [impeachment], error: null },
    list_countries: { data: countryRows, error: null },
    list_regions: { data: regionRows, error: null },
    ...extra,
  });
  setSession(fakeSession());
}

describe('government', () => {
  afterEach(() => {
    resetSupabaseMock();
    localStorage.clear();
  });

  it('shows the cabinet with its vacancies and lets the president appoint', async () => {
    const user = userEvent.setup();
    signIn('president', { appoint_minister: { data: null, error: null } });
    await renderRoute('/government');
    const panel = await screen.findByRole('region', { name: 'Gabinete' });
    expect(await within(panel).findByText('Camila Ríos · Frente Federal')).toBeVisible();
    expect(within(panel).getAllByText('Vacante')).toHaveLength(6);
    expect(
      within(panel).getByRole('button', { name: 'Remover a quien ocupa Ministerio de Economía' }),
    ).toBeVisible();
    const appoint = screen.getByRole('region', { name: 'Nombrar' });
    await user.selectOptions(within(appoint).getByLabelText('Cargo'), 'health');
    await user.type(within(appoint).getByLabelText('Ciudadano'), 'Juan Pérez');
    await user.click(within(appoint).getByRole('button', { name: 'Nombrar' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('appoint_minister', {
      p_ministry: 'health',
      p_name: 'Juan Pérez',
    });
    expect(await screen.findByText('Nombraste a Juan Pérez.')).toBeVisible();
  });

  it('lets a member of Congress vote a motion', async () => {
    const user = userEvent.setup();
    signIn('congress', { vote_motion: { data: null, error: null } });
    await renderRoute('/government');
    const motions = await screen.findByRole('region', { name: 'Mociones del Congreso' });
    expect(await within(motions).findByText('Juicio político a Camila Ríos')).toBeVisible();
    expect(screen.queryByRole('region', { name: 'Nombrar' })).toBeNull();
    await user.click(
      within(motions).getByRole('button', { name: 'A favor: Juicio político a Camila Ríos' }),
    );
    expect(supabaseMock.rpc).toHaveBeenCalledWith('vote_motion', {
      p_motion_id: 9,
      p_choice: 'yes',
    });
    expect(await within(motions).findByText('Tu voto quedó registrado.')).toBeVisible();
  });

  it("asks Congress to accept the vice president's resignation", async () => {
    const user = userEvent.setup();
    signIn('vice_president', { request_resignation: { data: 3, error: null } });
    await renderRoute('/government');
    await user.click(
      await screen.findByRole('button', { name: 'Pedir al Congreso que acepte mi renuncia' }),
    );
    expect(supabaseMock.rpc).toHaveBeenCalledWith('request_resignation');
    expect(await screen.findByText('El Congreso vota tu renuncia durante 24 horas.')).toBeVisible();
  });
});
