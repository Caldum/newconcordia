import { supabase } from '../../lib/supabase';

// Public hospitals. The patient asks for a treatment; the Health minister builds, upgrades, moves kits and sets the
// care policy. The database checks offices, regions, stock and funds.

export type CarePolicy = 'universal' | 'nationals' | 'non_enemies' | 'allies';

export async function requestTreatment(key: string) {
  const { data, error } = await supabase.rpc('hospital_treatment', { p_key: key });
  return { data: data?.[0] ?? null, error };
}

export function buildHospital(region: string, key: string) {
  return supabase.rpc('build_hospital', { p_region_code: region, p_key: key });
}

export function upgradeHospital(region: string, key: string) {
  return supabase.rpc('upgrade_hospital', { p_region_code: region, p_key: key });
}

export interface KitMove {
  /** A hospital's region, or null for Health's own store. */
  from: string | null;
  to: string | null;
  good: string;
  quantity: number;
}

export function moveKits(move: KitMove) {
  // Leaving a region out names Health's store.
  return supabase.rpc('move_kits', {
    p_good_code: move.good,
    p_quantity: move.quantity,
    ...(move.from === null ? {} : { p_from_region: move.from }),
    ...(move.to === null ? {} : { p_to_region: move.to }),
  });
}

export function setCarePolicy(policy: CarePolicy) {
  return supabase.rpc('set_care_policy', { p_policy: policy });
}
