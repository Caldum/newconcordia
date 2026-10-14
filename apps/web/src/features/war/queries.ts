import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { rows } from '../../lib/rows';
import { supabase } from '../../lib/supabase';
import { useSignedInUser } from '../auth/useSignedInUser';

/** The live score refreshes this often while a battle page is open. */
const liveMs = 5000;

const battleRowSchema = z.object({
  battle_id: z.number().int(),
  region_code: z.string(),
  kind: z.enum(['war', 'resistance']),
  attacker_country_code: z.string(),
  defender_country_code: z.string(),
  started_at: z.string(),
  current_round: z.number().int(),
  attacker_rounds: z.number().int(),
  defender_rounds: z.number().int(),
  status: z.enum(['active', 'finished']),
  winner: z.enum(['attacker', 'defender']).nullable(),
  finished_at: z.string().nullable(),
});

const battleSchema = battleRowSchema.omit({ current_round: true }).extend({
  current_round: z.number().int(),
  round_ends_at: z.string(),
  attacker_damage: z.number().int(),
  defender_damage: z.number().int(),
  /** The player's country made this its priority battle. */
  my_side_order: z.boolean(),
});

const roundSchema = z.object({
  round_no: z.number().int(),
  attacker_damage: z.number().int(),
  defender_damage: z.number().int(),
  winner: z.enum(['attacker', 'defender']),
});

const rankingSchema = z.object({
  side: z.enum(['attacker', 'defender']),
  name: z.string(),
  damage: z.number().int(),
  attacks: z.number().int(),
});

const weaponSchema = z.object({ good_code: z.string(), uses_left: z.number().int() });

const targetSchema = z.object({
  region_code: z.string(),
  country_code: z.string(),
  needs_authorization: z.boolean(),
});

const authorizationSchema = z.object({
  authorization_id: z.number().int(),
  target_country_code: z.string(),
  status: z.enum(['pending', 'started', 'expired', 'cancelled']),
  approved_at: z.string(),
  expires_at: z.string(),
  closed_at: z.string().nullable(),
});

const occupiedSchema = z.object({
  region_code: z.string(),
  restore_country_code: z.string(),
  occupier_country_code: z.string(),
  organizers: z.number().int(),
  needed: z.number().int(),
  /** The resistance battle under way, if any. */
  battle_id: z.number().int().nullable(),
  i_organize: z.boolean(),
});

export type OccupiedRegion = z.infer<typeof occupiedSchema>;
export type BattleRow = z.infer<typeof battleRowSchema>;
export type Battle = z.infer<typeof battleSchema>;
export type BattleRound = z.infer<typeof roundSchema>;
export type RankingLine = z.infer<typeof rankingSchema>;
export type LaunchTarget = z.infer<typeof targetSchema>;
export type WarAuthorization = z.infer<typeof authorizationSchema>;

export function useBattles() {
  return useQuery({
    queryKey: ['war', 'battles'],
    queryFn: () => rows(supabase.rpc('list_battles'), battleRowSchema),
  });
}

export function useBattle(battleId: number) {
  return useQuery({
    queryKey: ['war', 'battle', battleId],
    refetchInterval: liveMs,
    queryFn: async () =>
      (await rows(supabase.rpc('get_battle', { p_battle_id: battleId }), battleSchema))[0] ?? null,
  });
}

export function useBattleRounds(battleId: number) {
  return useQuery({
    queryKey: ['war', 'battle', battleId, 'rounds'],
    refetchInterval: liveMs,
    queryFn: () => rows(supabase.rpc('list_battle_rounds', { p_battle_id: battleId }), roundSchema),
  });
}

export function useBattleRanking(battleId: number) {
  return useQuery({
    queryKey: ['war', 'battle', battleId, 'ranking'],
    refetchInterval: liveMs,
    queryFn: () => rows(supabase.rpc('battle_ranking', { p_battle_id: battleId }), rankingSchema),
  });
}

export function useMyWeapon() {
  const { userId, enabled } = useSignedInUser();
  return useQuery({
    queryKey: ['me', userId, 'weapon'],
    enabled,
    queryFn: async () => (await rows(supabase.rpc('get_my_weapon'), weaponSchema))[0] ?? null,
  });
}

export function useLaunchTargets(enabled: boolean) {
  return useQuery({
    queryKey: ['war', 'targets'],
    enabled,
    queryFn: () => rows(supabase.rpc('list_launch_targets'), targetSchema),
  });
}

export function useOccupiedRegions() {
  return useQuery({
    queryKey: ['war', 'occupied'],
    queryFn: () => rows(supabase.rpc('list_occupied_regions'), occupiedSchema),
  });
}

const independenceSchema = z.object({
  war_id: z.number().int(),
  damage_target: z.number().int(),
  damage_total: z.number().int(),
  started_at: z.string(),
  ends_at: z.string(),
  status: z.enum(['active', 'closing', 'won', 'expired']),
  hero_name: z.string().nullable(),
});

const titleSchema = z.object({
  title: z.enum(['liberating_hero']),
  country_code: z.string(),
  granted_at: z.string(),
});

export type IndependenceWar = z.infer<typeof independenceSchema>;

export function useIndependenceWar(country: string) {
  return useQuery({
    queryKey: ['war', country, 'independence'],
    queryFn: async () =>
      (
        await rows(
          supabase.rpc('get_independence_war', { p_country_code: country }),
          independenceSchema,
        )
      )[0] ?? null,
  });
}

export function useMyTitles() {
  const { userId, enabled } = useSignedInUser();
  return useQuery({
    queryKey: ['me', userId, 'titles'],
    enabled,
    queryFn: () => rows(supabase.rpc('list_my_titles'), titleSchema),
  });
}

export function useWarAuthorizations(country: string) {
  return useQuery({
    queryKey: ['war', country, 'authorizations'],
    queryFn: () =>
      rows(
        supabase.rpc('list_war_authorizations', { p_country_code: country }),
        authorizationSchema,
      ),
  });
}
