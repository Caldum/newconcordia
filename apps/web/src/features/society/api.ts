import { supabase } from '../../lib/supabase';

// Missions, the press and private messages. The database checks progress, ownership and limits.

export async function claimDailyMissions() {
  const { data, error } = await supabase.rpc('claim_daily_missions');
  return { data: data?.[0] ?? null, error };
}

export function foundNewspaper(name: string) {
  return supabase.rpc('found_newspaper', { p_name: name });
}

export interface NewArticle {
  title: string;
  body: string;
}

export function publishArticle(article: NewArticle, key: string) {
  return supabase.rpc('publish_article', {
    p_title: article.title,
    p_body: article.body,
    p_key: key,
  });
}

/** Reading counts for the reading mission, so it is an action. */
export async function readArticle(articleId: number) {
  const { data, error } = await supabase.rpc('read_article', { p_article_id: articleId });
  return { data: data?.[0] ?? null, error };
}

export interface NewMessage {
  to: string;
  body: string;
}

export function sendMessage(message: NewMessage, key: string) {
  return supabase.rpc('send_message', { p_to_name: message.to, p_body: message.body, p_key: key });
}
