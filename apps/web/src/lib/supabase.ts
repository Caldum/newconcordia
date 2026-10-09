import type { Database } from '@concordia/db-types';
import { createClient } from '@supabase/supabase-js';

import { parseEnv } from './env';

const env = parseEnv(import.meta.env);

/** The browser client: publishable key only, so every call is subject to the database rules. */
export const supabase = createClient<Database>(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  },
);
