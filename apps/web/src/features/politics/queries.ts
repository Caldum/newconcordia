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

const officeSchema = z.enum([
  'president',
  'vice_president',
  'minister_economy',
  'minister_defense',
  'minister_foreign_affairs',
  'minister_health',
  'minister_development',
  'central_bank_governor',
]);

const cabinetSchema = z.object({
  office: officeSchema,
  name: z.string(),
  party_name: z.string().nullable(),
  since: z.string(),
});

const myOfficeSchema = z.object({
  office: z.union([officeSchema, z.literal('congress')]),
  country_code: z.string(),
});

const motionSchema = z.object({
  motion_id: z.number().int(),
  kind: z.enum(['resignation', 'inactivity_removal', 'impeachment']),
  target_name: z.string(),
  target_office: z.enum(['president', 'vice_president']),
  proposed_by_name: z.string(),
  /** Seats occupied when it opened: the base of absolute majorities and 2/3. */
  members: z.number().int(),
  opened_at: z.string(),
  closes_at: z.string(),
  status: z.enum(['open', 'counting', 'approved', 'rejected']),
  yes: z.number().int(),
  no: z.number().int(),
  abstain: z.number().int(),
  my_vote: z.enum(['yes', 'no', 'abstain']).nullable(),
});

export type Office = z.infer<typeof officeSchema>;
export type CabinetSeat = z.infer<typeof cabinetSchema>;
export type MyOffice = z.infer<typeof myOfficeSchema>;
export type Motion = z.infer<typeof motionSchema>;

export function useCabinet(country: string) {
  return useQuery({
    queryKey: ['government', country, 'cabinet'],
    queryFn: () => rows(supabase.rpc('get_cabinet', { p_country_code: country }), cabinetSchema),
  });
}

export function useMyOffice() {
  const { userId, enabled } = useSignedInUser();
  return useQuery({
    queryKey: ['me', userId, 'office'],
    enabled,
    queryFn: async () => (await rows(supabase.rpc('get_my_office'), myOfficeSchema))[0] ?? null,
  });
}

export function useMotions(country: string) {
  return useQuery({
    queryKey: ['government', country, 'motions'],
    queryFn: () => rows(supabase.rpc('list_motions', { p_country_code: country }), motionSchema),
  });
}

const billSchema = z.object({
  bill_id: z.number().int(),
  kind: z.enum([
    'ordinary',
    'taxes',
    'gold_transfer',
    'ministry_allocation',
    'currency_issuance',
    'central_bank_allocation',
    'war_authorization',
    'enemy_designation',
    'alliance',
    'break_relations',
    'peace',
    'embargo',
    'lift_embargo',
  ]),
  title: z.string(),
  body: z.string(),
  terms: z.record(z.string(), z.union([z.string(), z.number()])),
  majority: z.enum(['simple', 'two_thirds']),
  proposed_by_name: z.string(),
  proposer_office: z.string(),
  /** Seats occupied at presentation: the base of the quorum. */
  members: z.number().int(),
  opened_at: z.string(),
  closes_at: z.string(),
  status: z.enum(['voting', 'counting', 'executed', 'rejected', 'not_executed']),
  yes: z.number().int(),
  no: z.number().int(),
  abstain: z.number().int(),
  tiebreak: z.enum(['yes', 'no']).nullable(),
  failure: z.string().nullable(),
  my_vote: z.enum(['yes', 'no', 'abstain']).nullable(),
});

const initiativeSchema = z.object({
  office: z.string(),
  used: z.number().int(),
  /** Null: no limit (the president). */
  allowed: z.number().int().nullable(),
});

const decreeSchema = z.object({
  decree_id: z.number().int(),
  title: z.string(),
  body: z.string(),
  issued_by_name: z.string(),
  issued_at: z.string(),
});

const relationSchema = z.object({
  relation: z.enum(['alliance', 'alliance_pending', 'broken_relations', 'embargo', 'enemy']),
  other_country_code: z.string(),
  /** This country made it. */
  ours: z.boolean(),
  /** The kind of an embargo. */
  detail: z.enum(['economic', 'arms']).nullable(),
  since: z.string(),
});

export type ForeignRelation = z.infer<typeof relationSchema>;
export type Bill = z.infer<typeof billSchema>;
export type Initiative = z.infer<typeof initiativeSchema>;
export type Decree = z.infer<typeof decreeSchema>;

export function useBills(country: string) {
  return useQuery({
    queryKey: ['laws', country, 'bills'],
    queryFn: () => rows(supabase.rpc('list_bills', { p_country_code: country }), billSchema),
  });
}

export function useMyInitiative() {
  const { userId, enabled } = useSignedInUser();
  return useQuery({
    queryKey: ['me', userId, 'initiative'],
    enabled,
    queryFn: async () =>
      (await rows(supabase.rpc('get_my_initiative'), initiativeSchema))[0] ?? null,
  });
}

export function useForeignRelations(country: string) {
  return useQuery({
    queryKey: ['government', country, 'relations'],
    queryFn: () =>
      rows(supabase.rpc('list_foreign_relations', { p_country_code: country }), relationSchema),
  });
}

export function useDecrees(country: string) {
  return useQuery({
    queryKey: ['laws', country, 'decrees'],
    queryFn: () => rows(supabase.rpc('list_decrees', { p_country_code: country }), decreeSchema),
  });
}
