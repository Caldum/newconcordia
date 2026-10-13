import { supabase } from '../../lib/supabase';

/** What an admin switch schedules for the next day change. */
export interface Schedule {
  target: 'country' | 'region';
  code: string;
  /** In play (countries) or enabled (regions) from the next game day. */
  on: boolean;
}

/** Schedules a country or a region on or off; the database checks the admin and logs it. */
export function schedule({ target, code, on }: Schedule) {
  return target === 'country'
    ? supabase.rpc('admin_schedule_country', { p_country_code: code, p_active: on })
    : supabase.rpc('admin_schedule_region', { p_region_code: code, p_enabled: on });
}
