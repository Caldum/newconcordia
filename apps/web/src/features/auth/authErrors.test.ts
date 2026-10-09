import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import { authProblem } from './authErrors';

describe('authProblem', () => {
  it('maps the Auth error codes the screens explain', () => {
    expect(authProblem(new AuthApiError('Invalid', 400, 'invalid_credentials'))).toBe(
      'invalidCredentials',
    );
    expect(authProblem(new AuthApiError('captcha', 400, 'captcha_failed'))).toBe('captcha');
    expect(authProblem(new AuthApiError('slow down', 429, 'over_email_send_rate_limit'))).toBe(
      'rateLimit',
    );
    expect(authProblem(new AuthApiError('expired', 403, 'otp_expired'))).toBe('linkExpired');
  });

  it('recognizes a sign-up the database rejected', () => {
    expect(
      authProblem(new AuthApiError('Database error saving new user', 500, 'unexpected_failure')),
    ).toBe('signupRejected');
  });

  it('separates network failures from unknown errors', () => {
    expect(authProblem(new AuthRetryableFetchError('Failed to fetch', 0))).toBe('network');
    expect(authProblem(new AuthApiError('odd', 500, 'unexpected_failure'))).toBe('unknown');
    expect(authProblem(new Error('not from Auth'))).toBe('unknown');
  });
});
