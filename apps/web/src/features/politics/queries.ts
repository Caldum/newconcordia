import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { rows } from '../../lib/rows';
import { supabase } from '../../lib/supabase';
import { useSignedInUser } from '../auth/useSignedInUser';

const partySchema = z.object({
  party_id: z.number().int(),
  name: z.string(),
  description: z.string(),
  leader_name: z.string().nullable(),
  members: z.number().int(),
  founded_at: z.string(),
  /** Public funds, in hundredths. */
  gold: z.number().int(),
  credit: z.number().int(),
});

const memberSchema = z.object({
  name: z.string(),
  civil_level: z.number().int(),
  joined_at: z.string(),
  is_leader: z.boolean(),
});

const myPartySchema = z.object({
  party_id: z.number().int(),
  joined_at: z.string(),
  is_leader: z.boolean(),
});

const electionSchema = z.object({
  election_id: z.number().int(),
  status: z.enum(['registration', 'voting', 'validation']),
  registration_closes_at: z.string(),
  voting_starts_at: z.string(),
  voting_ends_at: z.string(),
  takes_office_at: z.string(),
  candidates: z.number().int(),
  voters: z.number().int(),
  ballots: z.number().int(),
  i_am_candidate: z.boolean(),
  i_voted: z.boolean(),
  i_can_vote: z.boolean(),
});

const candidateSchema = z.object({
  candidacy_id: z.number().int(),
  name: z.string(),
  civil_level: z.number().int(),
  registered_at: z.string(),
  /** Null until the election is proclaimed: ballots are secret. */
  votes: z.number().int().nullable(),
  elected: z.boolean(),
});

const lastElectionSchema = z.object({
  election_id: z.number().int(),
  proclaimed_at: z.string(),
  ballots: z.number().int(),
});

export type Party = z.infer<typeof partySchema>;
export type PartyMember = z.infer<typeof memberSchema>;
export type MyParty = z.infer<typeof myPartySchema>;
export type PartyElection = z.infer<typeof electionSchema>;
export type Candidate = z.infer<typeof candidateSchema>;
export type LastElection = z.infer<typeof lastElectionSchema>;

export function useParties(country: string) {
  return useQuery({
    queryKey: ['parties', country],
    queryFn: () => rows(supabase.rpc('list_parties', { p_country_code: country }), partySchema),
  });
}

export function usePartyMembers(partyId: number) {
  return useQuery({
    queryKey: ['parties', 'members', partyId],
    queryFn: () => rows(supabase.rpc('list_party_members', { p_party_id: partyId }), memberSchema),
  });
}

export function useMyParty() {
  const { userId, enabled } = useSignedInUser();
  return useQuery({
    queryKey: ['me', userId, 'party'],
    enabled,
    queryFn: async () => (await rows(supabase.rpc('get_my_party'), myPartySchema))[0] ?? null,
  });
}

export function usePartyElection(partyId: number) {
  return useQuery({
    queryKey: ['parties', 'election', partyId],
    queryFn: async () =>
      (
        await rows(supabase.rpc('get_party_election', { p_party_id: partyId }), electionSchema)
      )[0] ?? null,
  });
}

export function useCandidates(electionId: number) {
  return useQuery({
    queryKey: ['parties', 'candidates', electionId],
    queryFn: () =>
      rows(supabase.rpc('list_candidates', { p_election_id: electionId }), candidateSchema),
  });
}

export function useLastPartyElection(partyId: number) {
  return useQuery({
    queryKey: ['parties', 'last-election', partyId],
    queryFn: async () =>
      (
        await rows(
          supabase.rpc('get_last_party_election', { p_party_id: partyId }),
          lastElectionSchema,
        )
      )[0] ?? null,
  });
}

const nationalElectionSchema = z.object({
  election_id: z.number().int(),
  status: z.enum(['registration', 'voting', 'validation']),
  registration_opens_at: z.string(),
  registration_closes_at: z.string(),
  voting_starts_at: z.string(),
  voting_ends_at: z.string(),
  takes_office_at: z.string(),
  /** Congress: seats in play once candidacies close. */
  seats: z.number().int().nullable(),
  candidacies: z.number().int(),
  voters: z.number().int(),
  ballots: z.number().int(),
  i_voted: z.boolean(),
  i_can_vote: z.boolean(),
});

const ticketSchema = z.object({
  candidacy_id: z.number().int(),
  party_name: z.string(),
  president_name: z.string(),
  vice_president_name: z.string(),
  registered_at: z.string(),
  votes: z.number().int().nullable(),
  elected: z.boolean(),
});

const partyListSchema = z.object({
  candidacy_id: z.number().int(),
  party_name: z.string(),
  candidates: z.array(z.string()),
  registered_at: z.string(),
  votes: z.number().int().nullable(),
  seats: z.number().int().nullable(),
});

const officeholderSchema = z.object({
  office: z.enum(['president', 'vice_president']),
  name: z.string(),
  party_name: z.string().nullable(),
  since: z.string(),
});

const congressMemberSchema = z.object({
  name: z.string(),
  party_name: z.string().nullable(),
  since: z.string(),
});

export type ElectionKind = 'president' | 'congress';
export type NationalElection = z.infer<typeof nationalElectionSchema>;
export type Ticket = z.infer<typeof ticketSchema>;
export type PartyList = z.infer<typeof partyListSchema>;
export type Officeholder = z.infer<typeof officeholderSchema>;
export type CongressMember = z.infer<typeof congressMemberSchema>;

export function useNationalElection(country: string, kind: ElectionKind) {
  return useQuery({
    queryKey: ['elections', country, kind],
    queryFn: async () =>
      (
        await rows(
          supabase.rpc('get_national_election', { p_country_code: country, p_kind: kind }),
          nationalElectionSchema,
        )
      )[0] ?? null,
  });
}

export function useTickets(electionId: number) {
  return useQuery({
    queryKey: ['elections', 'tickets', electionId],
    queryFn: () => rows(supabase.rpc('list_tickets', { p_election_id: electionId }), ticketSchema),
  });
}

export function usePartyLists(electionId: number) {
  return useQuery({
    queryKey: ['elections', 'lists', electionId],
    queryFn: () =>
      rows(supabase.rpc('list_party_lists', { p_election_id: electionId }), partyListSchema),
  });
}

export function useGovernment(country: string) {
  return useQuery({
    queryKey: ['elections', country, 'government'],
    queryFn: () =>
      rows(supabase.rpc('get_government', { p_country_code: country }), officeholderSchema),
  });
}

export function useCongress(country: string) {
  return useQuery({
    queryKey: ['elections', country, 'congress-members'],
    queryFn: () =>
      rows(supabase.rpc('list_congress', { p_country_code: country }), congressMemberSchema),
  });
}
