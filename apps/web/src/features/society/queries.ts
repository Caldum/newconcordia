import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { rows } from '../../lib/rows';
import { supabase } from '../../lib/supabase';
import { useSignedInUser } from '../auth/useSignedInUser';

const missionSchema = z.object({
  mission: z.enum(['work', 'train', 'fight', 'read']),
  progress: z.number().int(),
  goal: z.number().int(),
  done: z.boolean(),
  claimed: z.boolean(),
  /** Days in a row claimed, up to yesterday or today. */
  streak: z.number().int(),
});

const stepSchema = z.object({
  step: z.enum(['work', 'buy', 'train', 'read', 'party', 'fight']),
  done: z.boolean(),
});

const articleSchema = z.object({
  article_id: z.number().int(),
  title: z.string(),
  newspaper: z.string(),
  author: z.string(),
  published_at: z.string(),
  readers: z.number().int(),
  read_by_me: z.boolean(),
});

const newspaperSchema = z.object({
  newspaper_id: z.number().int(),
  name: z.string(),
  articles: z.number().int(),
});

const conversationSchema = z.object({
  other_name: z.string(),
  last_body: z.string(),
  last_at: z.string(),
  unread: z.number().int(),
});

const messageSchema = z.object({
  message_id: z.number().int(),
  mine: z.boolean(),
  body: z.string(),
  sent_at: z.string(),
});

export type Mission = z.infer<typeof missionSchema>;
export type FirstStep = z.infer<typeof stepSchema>;
export type Article = z.infer<typeof articleSchema>;
export type Conversation = z.infer<typeof conversationSchema>;
export type PrivateMessage = z.infer<typeof messageSchema>;

export function useMissions() {
  const { userId, enabled } = useSignedInUser();
  return useQuery({
    queryKey: ['me', userId, 'missions'],
    enabled,
    queryFn: () => rows(supabase.rpc('get_my_missions'), missionSchema),
  });
}

export function useFirstSteps() {
  const { userId, enabled } = useSignedInUser();
  return useQuery({
    queryKey: ['me', userId, 'first-steps'],
    enabled,
    queryFn: () => rows(supabase.rpc('get_my_first_steps'), stepSchema),
  });
}

export function useArticles(country: string) {
  return useQuery({
    queryKey: ['press', country, 'articles'],
    queryFn: () => rows(supabase.rpc('list_articles', { p_country_code: country }), articleSchema),
  });
}

export function useMyNewspaper() {
  const { userId, enabled } = useSignedInUser();
  return useQuery({
    queryKey: ['me', userId, 'newspaper'],
    enabled,
    queryFn: async () => (await rows(supabase.rpc('get_my_newspaper'), newspaperSchema))[0] ?? null,
  });
}

export function useConversations() {
  const { userId, enabled } = useSignedInUser();
  return useQuery({
    queryKey: ['me', userId, 'conversations'],
    enabled,
    queryFn: () => rows(supabase.rpc('list_conversations'), conversationSchema),
  });
}

/** Reading a conversation marks the other's messages read. */
export function useConversation(withName: string | null) {
  const { userId, enabled } = useSignedInUser();
  return useQuery({
    queryKey: ['me', userId, 'conversation', withName],
    enabled: enabled && withName !== null,
    queryFn: () =>
      rows(supabase.rpc('list_messages', { p_with_name: withName ?? '' }), messageSchema),
  });
}

/** Private messages waiting to be read, checked every minute for the side panel. */
export function useUnreadMessages() {
  const { userId, enabled } = useSignedInUser();
  return useQuery({
    queryKey: ['me', userId, 'unread-messages'],
    enabled,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('count_unread_messages');
      if (error) throw error;
      return z.number().int().parse(data);
    },
  });
}
