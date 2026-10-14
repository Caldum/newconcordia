import { supabase } from '../../lib/supabase';

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
