import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { rows } from '../../lib/rows';
import { supabase } from '../../lib/supabase';

const priceSchema = z.object({
  key: z.string(),
  category: z.string(),
  /** GOLD hundredths. */
  price: z.number().int(),
  beneficiary: z.string(),
  /** Basis points of the price that go to a country's treasury; the rest leaves the game. */
  country_share_bp: z.number().int(),
});

export type PublicGoldPrice = z.infer<typeof priceSchema>;

/** Every GOLD price as the administration set it (public; changes are rare, so it is kept a while). */
export function useGoldPrices() {
  return useQuery({
    queryKey: ['gold-prices'],
    staleTime: 5 * 60 * 1000,
    queryFn: () => rows(supabase.rpc('get_gold_prices'), priceSchema),
  });
}
