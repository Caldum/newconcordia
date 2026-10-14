import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { rows } from '../../lib/rows';
import { supabase } from '../../lib/supabase';
import { useSignedInUser } from '../auth/useSignedInUser';

const detailsSchema = z.object({
  bio: z.string(),
  /** Null: the initials stand in. */
  avatar_path: z.string().nullable(),
  /** Place among the citizens of their country by experience. */
  national_rank: z.number().int().nullable(),
  national_citizens: z.number().int().nullable(),
  party_id: z.number().int().nullable(),
  party_name: z.string().nullable(),
  party_emblem_path: z.string().nullable(),
  regiment_id: z.number().int().nullable(),
  regiment_name: z.string().nullable(),
  regiment_emblem_path: z.string().nullable(),
  friends: z.number().int(),
  referrals: z.number().int(),
});

export const achievementKeys = [
  'first_shift',
  'first_training',
  'first_battle',
  'company_founder',
  'newspaper_founder',
  'first_article',
  'party_member',
  'party_leader',
  'regiment_founder',
  'office_holder',
  'mission_streak',
  'level_10',
  'sergeant',
  'liberating_hero',
] as const;

const achievementSchema = z.object({
  achievement: z.enum(achievementKeys),
  achieved: z.boolean(),
  achieved_at: z.string().nullable(),
});

const friendSchema = z.object({
  name: z.string(),
  avatar_path: z.string().nullable(),
  country_code: z.string(),
  status: z.enum(['friend', 'incoming', 'outgoing']),
  since: z.string(),
});

const referralSchema = z.object({
  name: z.string(),
  avatar_path: z.string().nullable(),
  country_code: z.string(),
  joined_at: z.string(),
});

export type ProfileDetails = z.infer<typeof detailsSchema>;
export type Achievement = z.infer<typeof achievementSchema>;
export type Friend = z.infer<typeof friendSchema>;
export type Referral = z.infer<typeof referralSchema>;

export function useProfileDetails() {
  const { userId, enabled } = useSignedInUser();
  return useQuery({
    queryKey: ['me', userId, 'profile-details'],
    enabled,
    queryFn: async () =>
      (await rows(supabase.rpc('get_my_profile_details'), detailsSchema))[0] ?? null,
  });
}

export function useAchievements() {
  const { userId, enabled } = useSignedInUser();
  return useQuery({
    queryKey: ['me', userId, 'achievements'],
    enabled,
    queryFn: () => rows(supabase.rpc('list_my_achievements'), achievementSchema),
  });
}

export function useFriends() {
  const { userId, enabled } = useSignedInUser();
  return useQuery({
    queryKey: ['me', userId, 'friends'],
    enabled,
    queryFn: () => rows(supabase.rpc('list_my_friends'), friendSchema),
  });
}

export function useReferrals() {
  const { userId, enabled } = useSignedInUser();
  return useQuery({
    queryKey: ['me', userId, 'referrals'],
    enabled,
    queryFn: () => rows(supabase.rpc('list_my_referrals'), referralSchema),
  });
}
