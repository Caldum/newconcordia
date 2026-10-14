import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { rows } from '../../lib/rows';
import { supabase } from '../../lib/supabase';
import { useSignedInUser } from '../auth/useSignedInUser';

const regimentSchema = z.object({
  regiment_id: z.number().int(),
  name: z.string(),
  emblem_path: z.string().nullable(),
  /** Null only in the instant a regiment is left without members. */
  leader: z.string().nullable(),
  members: z.number().int(),
  founded_at: z.string(),
});

const myRegimentSchema = z.object({
  regiment_id: z.number().int(),
  name: z.string(),
  emblem_path: z.string().nullable(),
  leader: z.string().nullable(),
  is_leader: z.boolean(),
  members: z.number().int(),
  joined_at: z.string(),
});

export type Regiment = z.infer<typeof regimentSchema>;
export type MyRegiment = z.infer<typeof myRegimentSchema>;

/** The regiments of a country, the largest first. */
export function useRegiments(country: string) {
  return useQuery({
    queryKey: ['regiments', country],
    queryFn: () =>
      rows(supabase.rpc('list_regiments', { p_country_code: country }), regimentSchema),
  });
}

export function useMyRegiment() {
  const { userId, enabled } = useSignedInUser();
  return useQuery({
    queryKey: ['me', userId, 'regiment'],
    enabled,
    queryFn: async () => (await rows(supabase.rpc('get_my_regiment'), myRegimentSchema))[0] ?? null,
  });
}
