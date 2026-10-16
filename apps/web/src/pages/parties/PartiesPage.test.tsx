import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Candidate, Party, PartyElection } from '../../features/politics/queries';
import { citizenRow } from '../../test/fixtures/citizen';
import { goldPricesAnswer } from '../../test/fixtures/goldPrices';
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

const parties: Party[] = [
  {
    party_id: 7,
    name: 'Frente Federal',
    description: 'Las provincias primero',
    leader_name: 'Camila Ríos',
    members: 3,
    founded_at: '2026-11-02T10:00:00Z',
    gold: 0,
    credit: 1000,
  },
];

const voting: PartyElection = {
  election_id: 11,
  status: 'voting',
  registration_closes_at: '2026-11-14T00:00:00Z',
  voting_starts_at: '2026-11-15T00:00:00Z',
  voting_ends_at: '2026-11-16T00:00:00Z',
  takes_office_at: '2026-11-16T12:00:00Z',
  candidates: 2,
  voters: 3,
  ballots: 1,
  i_am_candidate: false,
  i_voted: false,
  i_can_vote: true,
};

const candidates: Candidate[] = [
  {
    candidacy_id: 21,
    name: 'Marcos Villalba',
    civil_level: 4,
    registered_at: '2026-11-02T10:00:00Z',
    votes: null,
    elected: false,
  },
  {
    candidacy_id: 22,
    name: 'Camila Ríos',
    civil_level: 6,
    registered_at: '2026-11-03T10:00:00Z',
    votes: null,
    elected: false,
  },
];

type Answers = Parameters<typeof answerRpc>[0];

function signIn(extra: Answers = {}) {
  answerRpc({
    ...goldPricesAnswer,
    get_my_citizen: { data: [citizenRow()], error: null },
    get_my_profile: { data: [profileRow()], error: null },
    get_my_balances: { data: balanceRows, error: null },
    list_parties: { data: parties, error: null },
    get_my_party: { data: [], error: null },
    list_countries: { data: countryRows, error: null },
    list_regions: { data: regionRows, error: null },
    ...extra,
  });
  setSession(fakeSession());
}

function signInAsMember(extra: Answers = {}) {
  signIn({
    get_my_party: {
      data: [{ party_id: 7, joined_at: '2026-11-02T10:00:00Z', is_leader: false }],
      error: null,
    },
    list_party_members: {
      data: [
        { name: 'Camila Ríos', civil_level: 6, joined_at: '2026-11-02T10:00:00Z', is_leader: true },
      ],
      error: null,
    },
    get_party_election: { data: [voting], error: null },
    list_candidates: { data: candidates, error: null },
    get_last_party_election: { data: [], error: null },
    ...extra,
  });
}

describe('parties', () => {
  afterEach(() => {
    resetSupabaseMock();
    localStorage.clear();
  });

  it('lists the parties and founds one with an idempotency key', async () => {
    const user = userEvent.setup();
    signIn({ found_party: { data: 8, error: null } });
    await renderRoute('/parties');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Partidos de Argentina' }),
    ).toBeVisible();
    const list = screen.getByRole('region', { name: 'Partidos' });
    expect(within(list).getByText(/3 afiliados · Lidera Camila Ríos/)).toBeVisible();
    expect(within(list).getByRole('button', { name: 'Afiliarme a Frente Federal' })).toBeVisible();
    await user.type(screen.getByLabelText('Nombre'), '  Unión Cívica ');
    await user.click(screen.getByRole('button', { name: 'Fundar por 50 Oro' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('found_party', {
      p_name: 'Unión Cívica',
      p_description: '',
      p_key: expect.stringMatching(/^[0-9a-f-]{36}$/) as unknown,
    });
    expect(await screen.findByText('Fundaste Unión Cívica.')).toBeVisible();
  });

  it('refuses a short name without calling the database', async () => {
    const user = userEvent.setup();
    signIn();
    await renderRoute('/parties');
    await user.type(await screen.findByLabelText('Nombre'), 'FF');
    await user.click(screen.getByRole('button', { name: 'Fundar por 50 Oro' }));
    expect(screen.getByText('Escribe un nombre de 3 a 40 caracteres.')).toBeVisible();
    expect(supabaseMock.rpc).not.toHaveBeenCalledWith('found_party', expect.anything());
  });

  it('explains a founding the player cannot pay', async () => {
    const user = userEvent.setup();
    signIn({ found_party: { data: null, error: { message: 'insufficient_funds' } } });
    await renderRoute('/parties');
    await user.type(await screen.findByLabelText('Nombre'), 'Unión Cívica');
    await user.click(screen.getByRole('button', { name: 'Fundar por 50 Oro' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No te alcanza el saldo.');
  });

  it("shows the member's party and votes in the leader election", async () => {
    const user = userEvent.setup();
    signInAsMember({ vote: { data: null, error: null } });
    await renderRoute('/parties');
    expect(await screen.findByRole('heading', { level: 2, name: 'Frente Federal' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /Afiliarme/ })).toBeNull();
    const election = screen.getByRole('region', { name: 'Elección de líder' });
    expect(await within(election).findByText(/Votaron 1 de 3\./)).toBeVisible();
    await user.click(await within(election).findByRole('button', { name: 'Votar a Camila Ríos' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('vote', { p_candidacy_id: 22 });
    expect(await screen.findByText('Tu voto quedó registrado.')).toBeVisible();
  });

  it('donates Gold to the party', async () => {
    const user = userEvent.setup();
    signInAsMember({ donate_to_party: { data: null, error: null } });
    await renderRoute('/parties');
    const donate = await screen.findByRole('region', { name: 'Donar al partido' });
    await user.type(within(donate).getByLabelText('Importe'), '10');
    await user.click(within(donate).getByRole('button', { name: 'Donar' }));
    expect(supabaseMock.rpc).toHaveBeenCalledWith('donate_to_party', {
      p_party_id: 7,
      p_currency: 'GOLD',
      p_amount: 1000,
      p_key: expect.stringMatching(/^[0-9a-f-]{36}$/) as unknown,
    });
    expect(await screen.findByText('Donaste 10,00 Oro.')).toBeVisible();
  });
});
