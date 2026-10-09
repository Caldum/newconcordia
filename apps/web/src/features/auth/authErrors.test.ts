import { AuthApiError, AuthRetryableFetchError } from '@supabase/auth-js';
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

  // auth-js turns every 5xx into a retryable error without a code, so the status and message decide.
  it('recognizes a sign-up the database rejected', () => {
    expect(authProblem(new AuthRetryableFetchError('Database error saving new user', 500))).toBe(
      'signupRejected',
    );
    expect(
      authProblem(new AuthApiError('Database error saving new user', 500, 'unexpected_failure')),
    ).toBe('signupRejected');
  });

  it('calls only an unreachable server a connection problem', () => {
    expect(authProblem(new AuthRetryableFetchError('Failed to fetch', 0))).toBe('network');
    expect(authProblem(new AuthRetryableFetchError('Bad Gateway', 502))).toBe('network');
    expect(authProblem(new AuthRetryableFetchError('Gateway Timeout', 504))).toBe('network');
    expect(authProblem(new AuthRetryableFetchError('Web server is down', 521))).toBe('network');
  });

  it('reports a server failure as ours, not as the player’s connection', () => {
    expect(authProblem(new AuthRetryableFetchError('failed to verify captcha response', 500))).toBe(
      'unknown',
    );
    expect(authProblem(new AuthApiError('odd', 500, 'unexpected_failure'))).toBe('unknown');
    expect(authProblem(new Error('not from Auth'))).toBe('unknown');
  });
});
