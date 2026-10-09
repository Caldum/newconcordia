import { z } from 'zod';

import { supabase } from '../../lib/supabase';

/** Mirror of game.is_valid_citizen_name for instant feedback; the database has the last word. */
export function isValidCitizenName(name: string): boolean {
  // Count code points, as Postgres char_length does («Ríos» is 4).
  const length = Array.from(name).length;
  return (
    name === name.normalize('NFC') &&
    length >= 3 &&
    length <= 24 &&
    /^[\p{L}\p{N}]+\.?(?:[ '-][\p{L}\p{N}]+\.?)*$/u.test(name)
  );
}

export type NameStatus = 'available' | 'taken' | 'invalid';

export async function checkCitizenName(name: string, signupKey?: string): Promise<NameStatus> {
  const { data, error } = await supabase.rpc('check_citizen_name', {
    p_name: name,
    ...(signupKey ? { p_signup_key: signupKey } : {}),
  });
  if (error) throw error;
  return z.enum(['available', 'taken', 'invalid']).parse(data);
}
