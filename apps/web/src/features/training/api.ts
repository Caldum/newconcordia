import { supabase } from '../../lib/supabase';

export type CenterKind = 'basic' | 'advanced' | 'elite';

/** One session a day per center; the database refuses a second one. Returns what the session gave. */
export async function train(kind: CenterKind) {
  const { data, error } = await supabase.rpc('train', { p_kind: kind });
  return { data: data?.[0] ?? null, error };
}

export function upgradeCenter(kind: CenterKind, key: string) {
  return supabase.rpc('upgrade_training_center', { p_kind: kind, p_key: key });
}
