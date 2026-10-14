import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { rows } from '../../lib/rows';
import { supabase } from '../../lib/supabase';
import { useSignedInUser } from '../auth/useSignedInUser';

const termsSchema = z.object({
  enabled: z.boolean(),
  /** GOLD per kilometre: 0.0001. */
  gold_per_km: z.number(),
  /** The player's national currency, in which trips are paid. */
  currency_code: z.string(),
  /** Units of that currency per GOLD. */
  rate: z.number(),
  /** False while the currency's market had no trades in the last hours: the fallback rate. */
  rate_from_market: z.boolean(),
  /** Where the player is now. */
  region_code: z.string(),
});

const destinationSchema = z.object({
  region_code: z.string(),
  country_code: z.string(),
  km: z.number(),
  /** Hundredths of the player's currency. */
  price: z.number().int(),
});

export type TravelTerms = z.infer<typeof termsSchema>;
export type Destination = z.infer<typeof destinationSchema>;

export function useTravelTerms() {
  const { userId, enabled } = useSignedInUser();
  return useQuery({
    queryKey: ['me', userId, 'travel-terms'],
    enabled,
    queryFn: async () => (await rows(supabase.rpc('get_travel_terms'), termsSchema))[0] ?? null,
  });
}

/** Every region the player can travel to, nearest first, with what it costs. */
export function useTravelDestinations() {
  const { userId, enabled } = useSignedInUser();
  return useQuery({
    queryKey: ['me', userId, 'travel-destinations'],
    enabled,
    queryFn: () => rows(supabase.rpc('list_travel_destinations'), destinationSchema),
  });
}
