import type { EmailOtpType, Session } from '@supabase/auth-js';

import type { Locale } from '../../i18n';
import { supabase } from '../../lib/supabase';

import { emailRedirectTo } from './emailRedirect';

/** What a sign-up stores with the account; the database creates the citizen from it. */
export interface SignUpDetails {
  email: string;
  password: string;
  captchaToken: string;
  citizenName: string;
  countryCode: string;
  locale: Locale;
  signupKey: string;
  waitlistCountryCode: string | null;
}

export function signUp(details: SignUpDetails) {
  return supabase.auth.signUp({
    email: details.email,
    password: details.password,
    options: {
      captchaToken: details.captchaToken,
      emailRedirectTo: emailRedirectTo(),
      data: {
        citizen_name: details.citizenName,
        country_code: details.countryCode,
        locale: details.locale,
        signup_key: details.signupKey,
        ...(details.waitlistCountryCode
          ? { waitlist_country_code: details.waitlistCountryCode }
          : {}),
      },
    },
  });
}

export function resendSignUpEmail(email: string, captchaToken: string) {
  return supabase.auth.resend({
    type: 'signup',
    email,
    options: { captchaToken, emailRedirectTo: emailRedirectTo() },
  });
}

export function signInWithPassword(email: string, password: string, captchaToken: string) {
  return supabase.auth.signInWithPassword({ email, password, options: { captchaToken } });
}

export function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
}

export function sendPasswordRecovery(email: string, captchaToken: string) {
  return supabase.auth.resetPasswordForEmail(email, {
    captchaToken,
    redirectTo: emailRedirectTo(),
  });
}

export function updatePassword(password: string) {
  return supabase.auth.updateUser({ password });
}

/** Signs out everywhere (Supabase's default). */
export function signOut() {
  return supabase.auth.signOut();
}

/** Closes every other session, after a password change. */
export function signOutOtherSessions() {
  return supabase.auth.signOut({ scope: 'others' });
}

export function verifyEmailToken(tokenHash: string, type: EmailOtpType) {
  return supabase.auth.verifyOtp({ token_hash: tokenHash, type });
}

/** Follows the session: called with the stored one first, then on every change. Returns the stop. */
export function onSessionChange(listener: (event: string, session: Session | null) => void) {
  const { data } = supabase.auth.onAuthStateChange(listener);
  return () => {
    data.subscription.unsubscribe();
  };
}

/** Creates the citizen of an account that has none yet (Google sign-ups). */
export function createMyCitizen(name: string, countryCode: string, locale: Locale) {
  return supabase.rpc('create_my_citizen', {
    p_name: name,
    p_country_code: countryCode,
    p_locale: locale,
  });
}
