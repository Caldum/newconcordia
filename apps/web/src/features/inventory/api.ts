import { supabase } from '../../lib/supabase';

// Inventory actions. Each takes the idempotency key the database needs.

/** Uses one medical kit of the inventory; returns what it healed and the health after. */
export function applyKit(goodCode: string, key: string) {
  return supabase.rpc('use_kit', { p_good_code: goodCode, p_key: key });
}
