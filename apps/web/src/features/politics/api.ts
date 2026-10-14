import { supabase } from '../../lib/supabase';
import { storePicture } from '../profile/api';

import type { BillKind } from './billTerms';

// Party and election actions. Founding and donating take the idempotency key; the rest are naturally
// idempotent in the database (one membership, one candidacy, one ballot).

export interface NewParty {
  name: string;
  description: string;
}

export function foundParty(party: NewParty, key: string) {
  return supabase.rpc('found_party', {
    p_name: party.name,
    p_description: party.description,
    p_key: key,
  });
}

export function joinParty(partyId: number) {
  return supabase.rpc('join_party', { p_party_id: partyId });
}

export function leaveParty() {
  return supabase.rpc('leave_party');
}

export interface Donation {
  partyId: number;
  /** GOLD or the party's national currency. */
  currency: string;
  /** Hundredths. */
  amount: number;
}

export function donateToParty(donation: Donation, key: string) {
  return supabase.rpc('donate_to_party', {
    p_party_id: donation.partyId,
    p_currency: donation.currency,
    p_amount: donation.amount,
    p_key: key,
  });
}

export function registerCandidacy() {
  return supabase.rpc('register_candidacy');
}

export function withdrawCandidacy() {
  return supabase.rpc('withdraw_candidacy');
}

export function vote(candidacyId: number) {
  return supabase.rpc('vote', { p_candidacy_id: candidacyId });
}

export interface NewTicket {
  /** Citizen names, as the party leader picks them among the members. */
  president: string;
  vicePresident: string;
}

export function registerTicket(ticket: NewTicket) {
  return supabase.rpc('register_ticket', {
    p_president: ticket.president,
    p_vice_president: ticket.vicePresident,
  });
}

/** Names in list order. */
export function registerPartyList(names: readonly string[]) {
  return supabase.rpc('register_party_list', { p_names: [...names] });
}

export function withdrawPartyCandidacy(kind: 'president' | 'congress') {
  return supabase.rpc('withdraw_party_candidacy', { p_kind: kind });
}

export type Ministry = 'economy' | 'defense' | 'foreign_affairs' | 'health' | 'development';

export interface Appointment {
  /** A ministry, or the Central Bank. */
  office: Ministry | 'central_bank_governor';
  name: string;
}

export function appoint({ office, name }: Appointment) {
  return office === 'central_bank_governor'
    ? supabase.rpc('appoint_governor', { p_name: name })
    : supabase.rpc('appoint_minister', { p_ministry: office, p_name: name });
}

export function dismissOfficial(office: Ministry | 'central_bank_governor') {
  return supabase.rpc('dismiss_official', { p_office: office });
}

export function resignOffice() {
  return supabase.rpc('resign_office');
}

export function requestResignation() {
  return supabase.rpc('request_resignation');
}

export function proposeRemoval(office: 'president' | 'vice_president') {
  return supabase.rpc('propose_removal', { p_office: office });
}

export function proposeImpeachment() {
  return supabase.rpc('propose_impeachment');
}

export interface MotionVote {
  motionId: number;
  choice: 'yes' | 'no' | 'abstain';
}

export function voteMotion({ motionId, choice }: MotionVote) {
  return supabase.rpc('vote_motion', { p_motion_id: motionId, p_choice: choice });
}

/** Leaves the player's office: at once, or (president and vice president) by asking Congress. */
export async function leaveOffice(executive: boolean) {
  const { error } = executive ? await requestResignation() : await resignOffice();
  return { data: null, error };
}

export interface NewBill {
  kind: BillKind;
  title: string;
  body: string;
  /** Taxes as fractions, or the transfer's country and amount in hundredths; {} for ordinary laws. */
  terms: Record<string, string | number>;
}

export function proposeBill(bill: NewBill, key: string) {
  return supabase.rpc('propose_bill', {
    p_kind: bill.kind,
    p_title: bill.title,
    p_body: bill.body,
    p_terms: bill.terms,
    p_key: key,
  });
}

export interface BillVote {
  billId: number;
  choice: 'yes' | 'no' | 'abstain';
}

export function voteBill({ billId, choice }: BillVote) {
  return supabase.rpc('vote_bill', { p_bill_id: billId, p_choice: choice });
}

export interface TieBreak {
  billId: number;
  choice: 'yes' | 'no';
}

export function breakTie({ billId, choice }: TieBreak) {
  return supabase.rpc('break_tie', { p_bill_id: billId, p_choice: choice });
}

export interface NewDecree {
  title: string;
  body: string;
}

export function issueDecree(decree: NewDecree, key: string) {
  return supabase.rpc('issue_decree', { p_title: decree.title, p_body: decree.body, p_key: key });
}

/** The leader uploads and sets the party picture. */
export async function uploadPartyEmblem(partyId: number, file: File) {
  const stored = await storePicture(`parties/${String(partyId)}`, file);
  if (stored.error || !stored.data) return stored;
  return supabase.rpc('set_party_emblem', { p_path: stored.data });
}

export function removePartyEmblem() {
  return supabase.rpc('set_party_emblem', {});
}
