import { supabase } from '../../lib/supabase';
import { dropReplaced, storePicture } from '../profile/api';

export function foundRegiment(name: string) {
  return supabase.rpc('found_regiment', { p_name: name });
}

export function joinRegiment(regimentId: number) {
  return supabase.rpc('join_regiment', { p_regiment_id: regimentId });
}

export function leaveRegiment() {
  return supabase.rpc('leave_regiment');
}

/** The leader uploads and sets the regiment picture. */
export async function uploadRegimentEmblem(regimentId: number, file: File) {
  const stored = await storePicture(`regiments/${String(regimentId)}`, file);
  if (stored.error || !stored.data) return stored;
  return dropReplaced(await supabase.rpc('set_regiment_emblem', { p_path: stored.data }));
}

export async function removeRegimentEmblem() {
  return dropReplaced(await supabase.rpc('set_regiment_emblem', {}));
}
