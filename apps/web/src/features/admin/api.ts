import { supabase } from '../../lib/supabase';

/** What an admin switch schedules for the next day change. */
export interface Schedule {
  target: 'country' | 'region';
  code: string;
  /** In play (countries) or enabled (regions) from the next game day. */
  on: boolean;
}

export interface IndependenceWarStart {
  country: string;
  /** Damage that wins it early. */
  target: number;
}

/** Opens a sandbox independence war (PD-02); the database checks the admin and the switch, and logs it. */
export function startIndependenceWar({ country, target }: IndependenceWarStart) {
  return supabase.rpc('admin_start_independence_war', {
    p_country_code: country,
    p_damage_target: target,
  });
}

export interface Compensation {
  transactionId: number;
  reason: string;
}

/** Reverses a ledger transaction with a compensating one; the database checks the admin and logs it. */
export function compensate({ transactionId, reason }: Compensation) {
  return supabase.rpc('admin_compensate', { p_transaction_id: transactionId, p_reason: reason });
}

/** Marks an anti-abuse signal reviewed, with a note; audited. */
export function reviewAbuseSignal(signalId: number, note: string) {
  return supabase.rpc('admin_review_abuse_signal', { p_signal_id: signalId, p_note: note });
}

/** Gives an account (by email, never a citizen) a staff role or changes it; admins only, audited. */
export function grantStaff(email: string, role: 'admin' | 'moderator') {
  return supabase.rpc('admin_grant_staff', { p_email: email, p_role: role });
}

export function revokeStaff(email: string) {
  return supabase.rpc('admin_revoke_staff', { p_email: email });
}

export interface GoldPriceChange {
  key: string;
  /** Hundredths of GOLD. */
  price: number;
  /** Basis points of the price that go to the country's treasury. */
  shareBp: number;
  reason: string;
}

/** Sets what a GOLD payment costs and the country's share; applies to the next payment. Audited. */
export function setGoldPrice({ key, price, shareBp, reason }: GoldPriceChange) {
  return supabase.rpc('admin_set_gold_price', {
    p_key: key,
    p_price: price,
    p_country_share_bp: shareBp,
    p_reason: reason,
  });
}

export interface ParamChange {
  key: string;
  value: number;
  reason: string;
}

/** Changes a balance parameter at once. Audited. */
export function setParam({ key, value, reason }: ParamChange) {
  return supabase.rpc('admin_set_param', { p_key: key, p_value: value, p_reason: reason });
}

export interface NewSanction {
  name: string;
  kind: 'warning' | 'mute' | 'suspension';
  reason: 'spam' | 'abuse' | 'hate' | 'cheating' | 'multi_account' | 'name' | 'other';
  /** Shown to the player. */
  note: string;
  /** Null: for good (admins only past 30 days). Ignored for a warning. */
  hours: number | null;
}

export function sanction({ name, kind, reason, note, hours }: NewSanction) {
  return supabase.rpc('admin_sanction', {
    p_name: name,
    p_kind: kind,
    p_reason: reason,
    p_note: note,
    ...(hours === null ? {} : { p_hours: hours }),
  });
}

export function revokeSanction(sanctionId: number, note: string) {
  return supabase.rpc('admin_revoke_sanction', { p_sanction_id: sanctionId, p_note: note });
}

export function addStaffNote(name: string, body: string) {
  return supabase.rpc('admin_add_note', { p_name: name, p_body: body });
}

export function hideContent(kind: 'article' | 'message', target: string, note: string) {
  return supabase.rpc('admin_hide_content', { p_kind: kind, p_target: target, p_note: note });
}

export function clearProfile(name: string, note: string) {
  return supabase.rpc('admin_clear_profile', { p_name: name, p_note: note });
}

export function renameCitizen(name: string, newName: string, note: string) {
  return supabase.rpc('admin_rename_citizen', {
    p_name: name,
    p_new_name: newName,
    p_note: note,
  });
}

export type RenameKind = 'company' | 'party' | 'regiment' | 'newspaper';

export interface Rename {
  kind: RenameKind;
  id: number;
  newName: string;
  note: string;
}

/** Replaces the name of a company, party, regiment or newspaper. Audited. */
export function renameEntity({ kind, id, newName, note }: Rename) {
  return supabase.rpc('admin_rename', {
    p_kind: kind,
    p_id: id,
    p_new_name: newName,
    p_note: note,
  });
}

/** Schedules a country or a region on or off; the database checks the admin and logs it. */
export function schedule({ target, code, on }: Schedule) {
  return target === 'country'
    ? supabase.rpc('admin_schedule_country', { p_country_code: code, p_active: on })
    : supabase.rpc('admin_schedule_region', { p_region_code: code, p_enabled: on });
}
