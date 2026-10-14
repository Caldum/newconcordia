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

/** Schedules a country or a region on or off; the database checks the admin and logs it. */
export function schedule({ target, code, on }: Schedule) {
  return target === 'country'
    ? supabase.rpc('admin_schedule_country', { p_country_code: code, p_active: on })
    : supabase.rpc('admin_schedule_region', { p_region_code: code, p_enabled: on });
}
