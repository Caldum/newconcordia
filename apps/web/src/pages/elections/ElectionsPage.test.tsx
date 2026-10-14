import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { NationalElection, PartyList, Ticket } from '../../features/politics/queries';
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

const presidentialVoting: NationalElection = {
  election_id: 31,
  status: 'voting',
  registration_opens_at: '2026-11-06T12:00:00Z',
  registration_closes_at: '2026-12-04T00:00:00Z',
  voting_starts_at: '2026-12-05T00:00:00Z',
  voting_ends_at: '2026-12-06T00:00:00Z',
  takes_office_at: '2026-12-06T12:00:00Z',
  seats: null,
  candidacies: 2,
  voters: 6,
  ballots: 2,
  i_voted: false,
  i_can_vote: true,
};

// Candidacies open far in the future, whatever day the test runs.
const congressOpen: NationalElection = {
  ...presidentialVoting,
  election_id: 32,
  status: 'registration',
  registration_closes_at: '2099-12-24T00:00:00Z',
  voting_starts_at: '2099-12-25T00:00:00Z',
  voting_ends_at: '2099-12-26T00:00:00Z',
  takes_office_at: '2099-12-26T12:00:00Z',
  ballots: 0,
  i_can_vote: false,
};

const tickets: Ticket[] = [
  {
    candidacy_id: 41,
    party_name: 'Frente Federal',
    president_name: 'Camila Ríos',
    vice_president_name: 'Lucía Paz',
    registered_at: '2026-11-26T13:00:00Z',
    votes: null,
    elected: false,
  },
];

const lists: PartyList[] = [];

type Answers = Parameters<typeof answerRpc>[0];

function signIn(extra: Answers = {}) {
  answerRpc({
    get_my_citizen: { data: [citizenRow()], error: null },
    get_my_profile: { data: [profileRow()], error: null },
    get_my_balances: { data: balanceRows, error: null },
    get_national_election: { data: [presidentialVoting], error: null },
    list_tickets: { data: tickets, error: null },
    list_party_lists: { data: lists, error: null },
    get_government: {
      data: [
        {
          office: 'president',
          name: 'Adrián Sosa',
          party_name: 'Unión Cívica',
          since: '2026-11-06T12:00:00Z',
        },
      ],
      error: null,
    },
    list_congress: {
      data: [{ name: 'Pedro Gil', party_name: 'Frente Federal', since: '2026-11-26T12:00:00Z' }],
      error: null,
    },
    get_my_party: { data: [], error: null },
    list_countries: { data: countryRows, error: null },
    list_regions: { data: regionRows, error: null },
    ...extra,
  });
  setSession(fakeSession());
}

function signInAsLeader(extra: Answers = {}) {
  signIn({
    get_national_election: { data: [congressOpen], error: null },
    get_my_party: {
      data: [{ party_id: 7, joined_at: '2026-11-02T10:00:00Z', is_leader: true }],
      error: null,
    },
    list_party_members: {
      data: [
        {
          name: 'Camila Ríos',
          civil_level: 15,
          joined_at: '2026-11-02T10:00:00Z',
          is_leader: true,
        },
        { name: 'Pedro Gil', civil_level: 10, joined_at: '2026-11-02T10:05:00Z', is_leader: false },
      ],
      error: null,
    },
    ...extra,
  });
}

describe('elections', () => {
  afterEach(() => {
    resetSupabaseMock();
    localStorage.clear();
  });

  it('shows who governs and votes for a ticket', async () => {
    const user = userEvent.setup();
    signIn({ vote: { data: null, error: null } });
    await renderRoute('/elections');
    const government = await screen.findByRole('region', { name: 'Gobierno' });
    expect(await within(government).findByText('Adrián Sosa · Unión Cívica')).toBeVisible();
    expect(within(government).getByText('Vacante hasta la próxima elección')).toBeVisible();
    expect(within(government).getByText('Pedro Gil')).toBeVisible();
    const presidential = screen.getByRole('region', { name: 'Elección presidencial' });
    expect(await within(presidential).findByText('Camila Ríos y Lucía Paz')).toBeVisible();
    await user.click(within(presidential).getByRole('button', { name: 'Votar a Frente Federal' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('vote', { p_candidacy_id: 41 });
    expect(
      await screen.findByText('Tu voto quedó registrado. Es secreto hasta el resultado.'),
    ).toBeVisible();
  });

  it('lets the party leader order and register the list for Congress', async () => {
    const user = userEvent.setup();
    signInAsLeader({ register_party_list: { data: 51, error: null } });
    await renderRoute('/elections');
    const congress = await screen.findAllByRole('region', { name: 'Elección del Congreso' });
    const panel = congress[0];
    if (!panel) throw new Error('no congress panel');
    await user.click(await within(panel).findByRole('button', { name: 'Agregar a Camila Ríos' }));
    await user.click(within(panel).getByRole('button', { name: 'Agregar a Pedro Gil' }));
    await user.click(within(panel).getByRole('button', { name: 'Subir a Pedro Gil' }));
    expect(within(panel).getByText('1. Pedro Gil')).toBeVisible();
    await user.click(within(panel).getByRole('button', { name: 'Inscribir la lista' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('register_party_list', {
      p_names: ['Pedro Gil', 'Camila Ríos'],
    });
    expect(await within(panel).findByText('La lista quedó inscrita.')).toBeVisible();
  });

  it('explains a ticket the party cannot pay', async () => {
    const user = userEvent.setup();
    signInAsLeader({
      register_ticket: { data: null, error: { message: 'insufficient_funds' } },
    });
    await renderRoute('/elections');
    const presidential = (
      await screen.findAllByRole('region', { name: 'Elección presidencial' })
    )[0];
    if (!presidential) throw new Error('no presidential panel');
    await user.selectOptions(
      await within(presidential).findByLabelText('Presidencia'),
      'Camila Ríos',
    );
    await user.selectOptions(within(presidential).getByLabelText('Vicepresidencia'), 'Pedro Gil');
    await user.click(within(presidential).getByRole('button', { name: 'Inscribir la fórmula' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('register_ticket', {
      p_president: 'Camila Ríos',
      p_vice_president: 'Pedro Gil',
    });
    expect(await within(presidential).findByRole('alert')).toHaveTextContent(
      'Al partido no le alcanza el Oro: pide donaciones.',
    );
  });
});
