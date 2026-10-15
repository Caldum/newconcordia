import { supabase } from '../../lib/supabase';
import { emailRedirectTo } from '../auth/emailRedirect';

import { picturePath, shrinkPicture } from './pictures';

/** Shrinks and uploads a picture under a folder; the path on success. */
export async function storePicture(
  folder: string,
  file: File,
): Promise<{ data: string | null; error: Error | null }> {
  const blob = await shrinkPicture(file);
  const path = picturePath(folder, crypto.randomUUID());
  const { error } = await supabase.storage.upload(path, blob);
  return error ? { data: null, error } : { data: path, error: null };
}

/** The public address of a stored picture. */
export function pictureUrl(path: string): string {
  return supabase.storage.publicUrl(path);
}

/**
 * After setting a picture, deletes the one it replaced so the folder keeps room. A failed delete only leaves an
 * unused picture behind, so it does not fail the action.
 */
export async function dropReplaced<T extends { data: string | null; error: unknown }>(
  result: T,
): Promise<T> {
  if (!result.error && result.data) await supabase.storage.remove(result.data);
  return result;
}

export async function uploadAvatar(userId: string, file: File) {
  const stored = await storePicture(`citizens/${userId}`, file);
  if (stored.error || !stored.data) return stored;
  return dropReplaced(await supabase.rpc('set_my_avatar', { p_path: stored.data }));
}

/** Back to the initials. */
export async function removeAvatar() {
  return dropReplaced(await supabase.rpc('set_my_avatar', {}));
}

export function setMyBio(bio: string) {
  return supabase.rpc('set_my_bio', { p_bio: bio });
}

export function requestFriend(name: string) {
  return supabase.rpc('request_friend', { p_name: name });
}

export function answerFriend(name: string, accept: boolean) {
  return supabase.rpc('answer_friend', { p_name: name, p_accept: accept });
}

export function removeFriend(name: string) {
  return supabase.rpc('remove_friend', { p_name: name });
}

export function setMyReferrer(name: string) {
  return supabase.rpc('set_my_referrer', { p_name: name });
}

/** Supabase writes to the new address; the change applies once it is confirmed from there. */
export function changeEmail(email: string) {
  return supabase.auth.updateUser({ email }, { emailRedirectTo: emailRedirectTo() });
}

/** Claims every referral share that is claimable now; the GOLD paid, in hundredths. */
export function claimReferralRewards() {
  return supabase.rpc('claim_referral_rewards');
}
