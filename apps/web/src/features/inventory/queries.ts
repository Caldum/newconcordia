import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { rows } from '../../lib/rows';
import { supabase } from '../../lib/supabase';

const effectSchema = z.object({
  code: z.string(),
  damage_multiplier: z.number().nullable(),
  /** Energy one unit of food gives. */
  energy: z.number().int().nullable(),
  /** Health one medical kit restores. */
  heal: z.number().int().nullable(),
  food_energy_per_interval: z.number().int(),
});

export type GoodEffect = z.infer<typeof effectSchema>;

/** What each good does. The same for everyone and for the whole session. */
export function useGoodsEffects() {
  return useQuery({
    queryKey: ['goods-effects'],
    staleTime: Infinity,
    queryFn: () => rows(supabase.rpc('list_goods_effects'), effectSchema),
  });
}
