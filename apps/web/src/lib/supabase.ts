import type { Database } from '@concordia/db-types';
import { AuthClient } from '@supabase/auth-js';
import { PostgrestClient } from '@supabase/postgrest-js';

import { env } from './env';
import { authStorage } from './sessionStorage';

const baseUrl = new URL(env.VITE_SUPABASE_URL);
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Auth and PostgREST are all the web uses, so it skips supabase-js and its Realtime, Storage and
// Functions clients (ADR 0009). The live battle (D17) imports Realtime on demand.
const auth = new AuthClient({
  url: new URL('auth/v1', baseUrl).href,
  headers: { Authorization: `Bearer ${key}`, apikey: key },
  // supabase-js's default key, so sessions saved before the switch stay signed in.
  storageKey: `sb-${baseUrl.hostname.split('.')[0] ?? ''}-auth-token`,
  // PKCE for Google: the code in the callback URL is useless without the verifier in this browser.
  flowType: 'pkce',
  storage: authStorage,
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: true,
});

/** Calls the API with the player's session, or with the publishable key for visitors. */
const fetchWithSession: typeof fetch = async (input, init) => {
  const { data } = await auth.getSession();
  const headers = new Headers(init?.headers);
  if (!headers.has('apikey')) headers.set('apikey', key);
  if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${data.session?.access_token ?? key}`);
  }
  return fetch(input, { ...init, headers });
};

const rest = new PostgrestClient<Database>(new URL('rest/v1', baseUrl).href, {
  fetch: fetchWithSession,
});

/** The browser client: publishable key only, so every call is subject to the database rules. */
export const supabase = {
  auth,
  rpc: rest.rpc.bind(rest),
};
