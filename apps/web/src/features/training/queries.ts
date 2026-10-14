import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { rows } from '../../lib/rows';
import { supabase } from '../../lib/supabase';
import { useSignedInUser } from '../auth/useSignedInUser';

const centerSchema = z.object({
  kind: z.enum(['basic', 'advanced', 'elite']),
  level: z.number().int(),
  trained_today: z.boolean(),
  energy: z.number().int(),
  /** GOLD hundredths per session. */
  fee: z.number().int(),
  /** Strength a session gives at this level. */
  strength: z.number().int(),
  /** Chance of an injury, 0–1. */
  injury_chance: z.number(),
  /** GOLD hundredths to the next level; null at N5. */
  upgrade_cost: z.number().int().nullable(),
});

const injurySchema = z.object({
  cause: z.enum(['training', 'attack']),
  reference: z.string().nullable(),
  health_lost: z.number().int(),
  health_after: z.number().int(),
  created_at: z.string(),
});

export type TrainingCenter = z.infer<typeof centerSchema>;
export type Injury = z.infer<typeof injurySchema>;

export function useMyTraining() {
  const { userId, enabled } = useSignedInUser();
  return useQuery({
    queryKey: ['me', userId, 'training'],
    enabled,
    queryFn: () => rows(supabase.rpc('get_my_training'), centerSchema),
  });
}

export function useMyInjuries() {
  const { userId, enabled } = useSignedInUser();
  return useQuery({
    queryKey: ['me', userId, 'injuries'],
    enabled,
    queryFn: () => rows(supabase.rpc('list_my_injuries'), injurySchema),
  });
}
