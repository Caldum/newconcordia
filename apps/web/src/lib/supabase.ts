import type { Database } from '@concordia/db-types';
import { createClient } from '@supabase/supabase-js';

import { env } from './env';
import { authStorage } from './sessionStorage';

/** The browser client: publishable key only, so every call is subject to the database rules. */
export const supabase = createClient<Database>(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      // PKCE for Google: the code in the callback URL is useless without the verifier in this browser.
      flowType: 'pkce',
      storage: authStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
