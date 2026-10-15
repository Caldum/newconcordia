import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { rows } from '../../lib/rows';
import { supabase } from '../../lib/supabase';

const reportSchema = z.object({
  report_id: z.number().int(),
  target_kind: z.enum(['article', 'message', 'citizen']),
  target_id: z.string(),
  reason: z.enum(['spam', 'abuse', 'hate', 'cheating', 'other']),
  details: z.string(),
  status: z.enum(['open', 'dismissed', 'actioned']),
  created_at: z.string(),
  reporter_name: z.string().nullable(),
  /** The author of the article or message, or the reported citizen. */
  target_author: z.string().nullable(),
  target_title: z.string().nullable(),
  target_excerpt: z.string().nullable(),
  target_hidden: z.boolean(),
  reports_on_target: z.number().int(),
  resolution: z.string().nullable(),
  /** The reported citizen's picture, if they have one. */
  target_picture: z.string().nullable(),
});

const inviteSchema = z.object({
  email: z.string(),
  note: z.string(),
  invited_by: z.string().nullable(),
  created_at: z.string(),
  used_at: z.string().nullable(),
});

export type ModerationReport = z.infer<typeof reportSchema>;
export type BetaInvite = z.infer<typeof inviteSchema>;

/** Open reports for moderators, oldest first. */
export function useOpenReports(enabled: boolean) {
  return useQuery({
    queryKey: ['me', 'admin', 'reports'],
    enabled,
    queryFn: () => rows(supabase.rpc('admin_list_reports', { p_status: 'open' }), reportSchema),
  });
}

export function useBetaInvites(enabled: boolean) {
  return useQuery({
    queryKey: ['me', 'admin', 'beta-invites'],
    enabled,
    queryFn: () => rows(supabase.rpc('admin_list_beta_invites'), inviteSchema),
  });
}

/** Whether the game is in closed beta; public. */
export function useBetaStatus() {
  return useQuery({
    queryKey: ['beta-status'],
    queryFn: async () =>
      (await rows(supabase.rpc('get_beta_status'), z.object({ closed: z.boolean() })))[0]?.closed ??
      false,
  });
}
