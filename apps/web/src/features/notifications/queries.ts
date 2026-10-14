import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { rows } from '../../lib/rows';
import { supabase } from '../../lib/supabase';
import { useSignedInUser } from '../auth/useSignedInUser';

/** How often the unread count is refreshed while playing. */
const unreadMs = 60_000;

const notificationSchema = z.object({
  notification_id: z.number().int(),
  kind: z.string(),
  payload: z.record(z.string(), z.unknown()),
  created_at: z.string(),
  unread: z.boolean(),
});

export type GameNotification = z.infer<typeof notificationSchema>;

export function useNotifications() {
  const { userId, enabled } = useSignedInUser();
  return useQuery({
    queryKey: ['me', userId, 'notifications'],
    enabled,
    queryFn: () => rows(supabase.rpc('list_my_notifications', { p_limit: 50 }), notificationSchema),
  });
}

export function useUnreadCount() {
  const { userId, enabled } = useSignedInUser();
  return useQuery({
    queryKey: ['me', userId, 'unread'],
    enabled,
    refetchInterval: unreadMs,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('count_unread_notifications');
      if (error) throw error;
      return z.number().int().parse(data);
    },
  });
}
