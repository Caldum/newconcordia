import { supabase } from '../../lib/supabase';

// War: launching (president), attacking, weapons, the priority battle (Defense) and authorizations. The database
// decides eligibility, damage, XP and injuries.

export type Side = 'attacker' | 'defender';

export function launchOffensive(region: string, key: string) {
  return supabase.rpc('launch_offensive', { p_region_code: region, p_key: key });
}

export async function attack(battleId: number, side: Side, key: string) {
  const { data, error } = await supabase.rpc('attack', {
    p_battle_id: battleId,
    p_side: side,
    p_key: key,
  });
  return { data: data?.[0] ?? null, error };
}

export function equipWeapon(good: string) {
  return supabase.rpc('equip_weapon', { p_good_code: good });
}

export function setBattleOrder(battleId: number) {
  return supabase.rpc('set_battle_order', { p_battle_id: battleId });
}

export function cancelWarAuthorization(authorizationId: number) {
  return supabase.rpc('cancel_war_authorization', { p_authorization_id: authorizationId });
}
