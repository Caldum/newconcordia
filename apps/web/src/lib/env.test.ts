import { describe, expect, it } from 'vitest';

import { parseEnv } from './env';

describe('parseEnv', () => {
  it('accepts the public Supabase configuration', () => {
    expect(
      parseEnv({
        VITE_SUPABASE_URL: 'https://abcdefghijklmnop.supabase.co',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_0123456789abcdef',
      }),
    ).toEqual({
      VITE_SUPABASE_URL: 'https://abcdefghijklmnop.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_0123456789abcdef',
    });
  });

  it('names what is missing or wrong without echoing values', () => {
    expect(() => parseEnv({ VITE_SUPABASE_URL: 'not a url' })).toThrow(
      'Invalid or missing public configuration: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY. See docs/setup.md.',
    );
  });
});
