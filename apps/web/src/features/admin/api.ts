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

/** Schedules a country or a region on or off; the database checks the admin and logs it. */
export function schedule({ target, code, on }: Schedule) {
  return target === 'country'
    ? supabase.rpc('admin_schedule_country', { p_country_code: code, p_active: on })
    : supabase.rpc('admin_schedule_region', { p_region_code: code, p_enabled: on });
}
