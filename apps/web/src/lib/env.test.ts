import { describe, expect, it } from 'vitest';

import { parseEnv } from './env';

const valid = {
  VITE_SUPABASE_URL: 'https://abcdefghijklmnop.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_0123456789abcdef',
  VITE_TURNSTILE_SITE_KEY: '0x4AAAAAAAexample',
};

describe('parseEnv', () => {
  it('accepts the public configuration and keeps Google off unless enabled', () => {
    expect(parseEnv(valid)).toEqual({ ...valid, VITE_GOOGLE_SIGN_IN: false });
    expect(parseEnv({ ...valid, VITE_GOOGLE_SIGN_IN: 'true' }).VITE_GOOGLE_SIGN_IN).toBe(true);
  });

  it('names what is missing or wrong without echoing values', () => {
    expect(() => parseEnv({ VITE_SUPABASE_URL: 'not a url' })).toThrow(
      'Invalid or missing public configuration: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_TURNSTILE_SITE_KEY. See docs/setup.md.',
    );
  });
});
