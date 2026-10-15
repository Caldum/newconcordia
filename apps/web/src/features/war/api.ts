import { supabase } from '../../lib/supabase';
import { errorCode } from '../actions/gameErrors';

import { strikeKey } from './live';

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

export function joinResistance(region: string, key: string) {
  return supabase.rpc('join_resistance', { p_region_code: region, p_key: key });
}

export async function independenceAttack(warId: number, key: string) {
  const { data, error } = await supabase.rpc('independence_attack', {
    p_war_id: warId,
    p_key: key,
  });
  return { data: data?.[0] ?? null, error };
}

export interface StrikeBurst {
  strikes: number;
  damage: number;
  healthLost: number;
  warStatus: string;
  /** Why the burst stopped early (energy, health, the war ended), or null when every strike went in. */
  stoppedBy: string | null;
}

/**
 * Up to `count` strikes in a row, one after another; each has its own key derived from the burst's, so a retry
 * repeats the same strikes. It stops at the first refusal: with none landed that refusal is the error, otherwise
 * it comes back as `stoppedBy` with what landed.
 */
export async function independenceStrikes(
  warId: number,
  count: number,
  key: string,
): Promise<{ data: StrikeBurst | null; error: unknown }> {
  const burst: StrikeBurst = {
    strikes: 0,
    damage: 0,
    healthLost: 0,
    warStatus: 'active',
    stoppedBy: null,
  };
  for (let index = 0; index < count; index += 1) {
    const { data, error } = await independenceAttack(warId, strikeKey(key, index));
    if (error || !data) {
      if (burst.strikes === 0) return { data: null, error: error ?? new Error('strike_failed') };
      burst.stoppedBy = errorCode(error);
      break;
    }
    burst.strikes += 1;
    burst.damage += data.damage;
    burst.healthLost += data.health_lost;
    burst.warStatus = data.war_status;
    if (data.war_status !== 'active') break;
  }
  return { data: burst, error: null };
}

export function cancelWarAuthorization(authorizationId: number) {
  return supabase.rpc('cancel_war_authorization', { p_authorization_id: authorizationId });
}
