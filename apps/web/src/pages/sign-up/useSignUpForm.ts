import { otherCountry } from '@concordia/atlas/CountryPicker';
import { useNavigate } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import type { RefObject } from 'react';

import { signUp } from '../../features/auth/api';
import { authProblem } from '../../features/auth/authErrors';
import type { AuthProblem } from '../../features/auth/authErrors';
import { checkCitizenName } from '../../features/auth/citizenName';
import type { NameStatus } from '../../features/auth/citizenName';
import { looksLikeEmail } from '../../features/auth/emailAddress';
import { minimumPasswordLength } from '../../features/auth/passwordRules';
import { newSignupKey, readSignupDraft, saveSignupDraft } from '../../features/auth/signupDraft';
import type { TurnstileHandle } from '../../features/auth/Turnstile';
import { useLocale } from '../../i18n';

/**
 * The sign-up form: its fields (restored from the draft when coming back to correct the email), their
 * validation, and sending it. The first invalid field gets the focus (the component owns the refs).
 */
export interface SignUpRefs {
  turnstile: RefObject<TurnstileHandle | null>;
  emailInput: RefObject<HTMLInputElement | null>;
  passwordInput: RefObject<HTMLInputElement | null>;
  nameInput: RefObject<HTMLInputElement | null>;
}

export function useSignUpForm({ turnstile, emailInput, passwordInput, nameInput }: SignUpRefs) {
  const { locale } = useLocale();
  const navigate = useNavigate();
  // Coming back from «Corrígela» keeps everything but the password, and the same sign-up key.
  const [draft] = useState(() => readSignupDraft());
  const [signupKey] = useState(() => draft?.signupKey ?? newSignupKey());
  const [email, setEmail] = useState(draft?.email ?? '');
  const [password, setPassword] = useState('');
  const [citizenName, setCitizenName] = useState(draft?.citizenName ?? '');
  // «Otro país» keeps the picker on `otherCountry`; the player then waits for one and starts in another.
  const [countryCode, setCountryCode] = useState<string | null>(
    draft?.waitlistCountryCode ? otherCountry : (draft?.countryCode ?? null),
  );
  const [waitlistCountry, setWaitlistCountry] = useState<string | null>(
    draft?.waitlistCountryCode ?? null,
  );
  const [startCountry, setStartCountry] = useState<string | null>(
    draft?.waitlistCountryCode ? draft.countryCode : null,
  );
  const [nameStatus, setNameStatus] = useState<NameStatus | 'unknown'>('unknown');
  const [forcedNameStatus, setForcedNameStatus] = useState<NameStatus | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState<AuthProblem | null>(null);

  const passwordMissing = minimumPasswordLength - password.length;
  const waits = countryCode === otherCountry;

  const submit = async () => {
    setShowErrors(true);
    setProblem(null);
    const trimmedEmail = email.trim();
    const trimmedName = citizenName.trim();
    if (!looksLikeEmail(trimmedEmail)) {
      emailInput.current?.focus();
      return;
    }
    if (passwordMissing > 0) {
      passwordInput.current?.focus();
      return;
    }
    if (nameStatus === 'invalid' || nameStatus === 'taken' || trimmedName === '') {
      nameInput.current?.focus();
      return;
    }
    const startsIn = waits ? startCountry : countryCode;
    if (!startsIn || (waits && !waitlistCountry)) return;
    if (!captchaToken) {
      setProblem('captcha');
      return;
    }

    setSending(true);
    const details = {
      email: trimmedEmail,
      citizenName: trimmedName,
      countryCode: startsIn,
      waitlistCountryCode: waits ? waitlistCountry : null,
      signupKey,
    };
    const { error } = await signUp({ ...details, password, captchaToken, locale });
    turnstile.current?.reset();

    if (error) {
      setSending(false);
      const kind = authProblem(error);
      if (kind === 'signupRejected') {
        // Most likely someone took the name a moment ago: ask again to say so on the field.
        const status = await checkCitizenName(trimmedName, signupKey).catch(() => null);
        if (status === 'taken' || status === 'invalid') {
          setForcedNameStatus(status);
          nameInput.current?.focus();
          return;
        }
      }
      setProblem(kind);
      return;
    }

    saveSignupDraft(details);
    await navigate({ to: '/verify-email' });
  };

  return {
    signupKey,
    email,
    setEmail,
    emailValid: looksLikeEmail(email.trim()),
    password,
    setPassword,
    passwordMissing,
    citizenName,
    setCitizenName: (name: string) => {
      setCitizenName(name);
      setForcedNameStatus(null);
    },
    onNameStatus: useCallback((status: NameStatus | 'unknown') => {
      setNameStatus(status);
    }, []),
    forcedNameStatus,
    countryCode,
    setCountryCode,
    waits,
    waitlistCountry,
    setWaitlistCountry,
    startCountry,
    setStartCountry,
    setCaptchaToken,
    showErrors,
    sending,
    problem,
    submit,
  };
}
