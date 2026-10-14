import { supabase } from '../../lib/supabase';

/** Marks every notification up to now as seen. */
export function markNotificationsSeen() {
  return supabase.rpc('mark_notifications_seen');
}
