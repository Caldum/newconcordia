import { queryOptions, useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { supabase } from '../../lib/supabase';

import { useAuth } from './AuthProvider';

const citizenSchema = z.object({
  name: z.string(),
  country_code: z.string(),
  locale: z.enum(['es', 'en']),
});

export type Citizen = z.infer<typeof citizenSchema>;

export async function fetchMyCitizen(): Promise<Citizen | null> {
  const { data, error } = await supabase.rpc('get_my_citizen');
  if (error) throw error;
  const rows = z.array(citizenSchema).parse(data);
  return rows[0] ?? null;
}

export function citizenQuery(userId: string) {
  return queryOptions({ queryKey: ['me', userId, 'citizen'], queryFn: fetchMyCitizen });
}

/** The signed-in player's citizen; `null` when the account has none yet (Google sign-ups). */
export function useCitizen() {
  const auth = useAuth();
  const userId = auth.status === 'signedIn' ? auth.session.user.id : '';
  return useQuery({ ...citizenQuery(userId), enabled: auth.status === 'signedIn' });
}
