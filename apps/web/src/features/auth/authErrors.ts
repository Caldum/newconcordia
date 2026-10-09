import { isAuthError } from '@supabase/auth-js';

/** What went wrong, in terms the screens can explain. Messages live in ./messages.ts. */
export type AuthProblem =
  | 'invalidCredentials'
  | 'emailNotConfirmed'
  | 'weakPassword'
  | 'samePassword'
  | 'captcha'
  | 'rateLimit'
  | 'linkExpired'
  | 'emailInvalid'
  | 'signupRejected'
  | 'network'
  | 'unknown';

const byCode: Readonly<Record<string, AuthProblem>> = {
  invalid_credentials: 'invalidCredentials',
  email_not_confirmed: 'emailNotConfirmed',
  weak_password: 'weakPassword',
  same_password: 'samePassword',
  captcha_failed: 'captcha',
  over_email_send_rate_limit: 'rateLimit',
  over_request_rate_limit: 'rateLimit',
  otp_expired: 'linkExpired',
  flow_state_expired: 'linkExpired',
  email_address_invalid: 'emailInvalid',
  validation_failed: 'emailInvalid',
};

/** No answer at all (status 0) or a gateway that could not reach Auth. */
function isUnreachable(status: number | undefined): boolean {
  return status === 0 || status === 502 || status === 503 || status === 504 || (status ?? 0) >= 520;
}

/** Maps a Supabase Auth error to an AuthProblem. */
export function authProblem(error: unknown): AuthProblem {
  if (!isAuthError(error)) return 'unknown';
  if (error.code && error.code in byCode) return byCode[error.code] ?? 'unknown';
  // The citizen trigger rejected the sign-up (taken or invalid name, country not in play). auth-js
  // delivers this 500 as a retryable error without a code, so the message is what tells it apart.
  if (error.status === 500 && /database error/i.test(error.message)) return 'signupRejected';
  if (isUnreachable(error.status)) return 'network';
  return 'unknown';
}
