import { supabase } from '../../lib/supabase';

/** A trip to another region, paid in the national currency; the key makes a retry the same trip. */
export function travel(region: string, key: string) {
  return supabase.rpc('travel', { p_region_code: region, p_key: key });
}
