import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { supabase } from '../../lib/supabase';
import { useAuth } from '../auth/AuthProvider';

const waitlistSchema = z.object({
  country_code: z.string(),
  joined_at: z.string(),
  place: z.number().int(),
});

const requestSchema = z.object({
  request_id: z.number(),
  to_country_code: z.string(),
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']),
  created_at: z.string(),
  decided_at: z.string().nullable(),
  answer_by: z.string(),
});

const rulesSchema = z.object({
  country_code: z.string(),
  mode: z.enum(['automatic', 'review']),
  election_wait_days: z.number().int(),
  answer_hours: z.number().int(),
});

const reviewSchema = z.object({
  request_id: z.number(),
  citizen_name: z.string(),
  from_country_code: z.string(),
  account_age_days: z.number().int(),
  created_at: z.string(),
  answer_by: z.string(),
});

export type Waitlist = z.infer<typeof waitlistSchema>;
export type CitizenshipRequest = z.infer<typeof requestSchema>;
export type CitizenshipRules = z.infer<typeof rulesSchema>;
export type RequestToReview = z.infer<typeof reviewSchema>;

/** Everything about the signed-in player is under ['me', userId], dropped on sign-out. */
function useMeKey(...parts: string[]) {
  const auth = useAuth();
  const userId = auth.status === 'signedIn' ? auth.session.user.id : '';
  return { key: ['me', userId, ...parts], enabled: auth.status === 'signedIn' };
}

async function firstRow<T>(
  call: PromiseLike<{ data: unknown; error: unknown }>,
  schema: z.ZodType<T>,
) {
  const { data, error } = await call;
  if (error) throw error instanceof Error ? error : new Error(JSON.stringify(error));
  return z.array(schema).parse(data)[0] ?? null;
}

export function useMyWaitlist() {
  const { key, enabled } = useMeKey('waitlist');
  return useQuery({
    queryKey: key,
    enabled,
    queryFn: () => firstRow(supabase.rpc('get_my_waitlist'), waitlistSchema),
  });
}

export function useMyCitizenshipRequest() {
  const { key, enabled } = useMeKey('citizenship-request');
  return useQuery({
    queryKey: key,
    enabled,
    queryFn: () => firstRow(supabase.rpc('get_my_citizenship_request'), requestSchema),
  });
}

export function useRequestsToReview() {
  const { key, enabled } = useMeKey('citizenship-requests-to-review');
  return useQuery({
    queryKey: key,
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_citizenship_requests');
      if (error) throw error;
      return z.array(reviewSchema).parse(data);
    },
  });
}

export function useCitizenshipRules(countryCode: string | null) {
  return useQuery({
    queryKey: ['citizenship-rules', countryCode],
    enabled: countryCode !== null,
    queryFn: () =>
      firstRow(
        supabase.rpc('get_citizenship_rules', { p_country_code: countryCode ?? '' }),
        rulesSchema,
      ),
  });
}

export function useWaitlistCount(countryCode: string | null) {
  return useQuery({
    queryKey: ['waitlist-count', countryCode],
    enabled: countryCode !== null,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('count_waitlist', {
        p_country_code: countryCode ?? '',
      });
      if (error) throw error;
      return z.number().int().parse(data);
    },
  });
}
