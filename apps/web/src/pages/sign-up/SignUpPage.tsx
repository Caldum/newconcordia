import { Button } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { Note } from '@concordia/atlas/Note';
import { Steps } from '@concordia/atlas/Steps';
import { Link, useNavigate } from '@tanstack/react-router';
import { useCallback, useRef, useState } from 'react';
import type { SubmitEvent } from 'react';

import { authProblem } from '../../features/auth/authErrors';
import type { AuthProblem } from '../../features/auth/authErrors';
import styles from '../../features/auth/AuthForm.module.css';
import { AuthLayout } from '../../features/auth/AuthLayout';
import { checkCitizenName } from '../../features/auth/citizenName';
import type { NameStatus } from '../../features/auth/citizenName';
import { CitizenNameField } from '../../features/auth/CitizenNameField';
import { CountryField } from '../../features/auth/CountryField';
import { emailRedirectTo } from '../../features/auth/emailRedirect';
import { GoogleSignIn } from '../../features/auth/GoogleButton';
import { SignedOutOnly } from '../../features/auth/guards';
import { authMessages } from '../../features/auth/messages';
import { PasswordField } from '../../features/auth/PasswordField';
import { newSignupKey, readSignupDraft, saveSignupDraft } from '../../features/auth/signupDraft';
import { Story } from '../../features/auth/Story';
import { Turnstile } from '../../features/auth/Turnstile';
import type { TurnstileHandle } from '../../features/auth/Turnstile';
import { useLocale, useMessages } from '../../i18n';
import { supabase } from '../../lib/supabase';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import { messages } from './messages';

export const minimumPasswordLength = 10;

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function SignUpForm() {
  const copy = useMessages(messages);
  const shared = useMessages(authMessages);
  const { locale } = useLocale();
  const navigate = useNavigate();
  // Coming back from «Corrígela» keeps everything but the password, and the same sign-up key.
  const [draft] = useState(() => readSignupDraft());
  const [signupKey] = useState(() => draft?.signupKey ?? newSignupKey());
  const [email, setEmail] = useState(draft?.email ?? '');
  const [password, setPassword] = useState('');
  const [citizenName, setCitizenName] = useState(draft?.citizenName ?? '');
  const [countryCode, setCountryCode] = useState<string | null>(draft?.countryCode ?? null);
  const [nameStatus, setNameStatus] = useState<NameStatus | 'unknown'>('unknown');
  const [forcedNameStatus, setForcedNameStatus] = useState<NameStatus | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaUnavailable, setCaptchaUnavailable] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState<AuthProblem | null>(null);
  const turnstile = useRef<TurnstileHandle>(null);
  const emailInput = useRef<HTMLInputElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);

  const emailError =
    showErrors && !looksLikeEmail(email.trim())
      ? email.trim() === ''
        ? copy.emailMissing
        : shared.problem('emailInvalid')
      : undefined;
  const missing = minimumPasswordLength - password.length;
  const passwordError = showErrors && missing > 0 ? copy.passwordShort(missing) : undefined;

  const onNameStatus = useCallback((status: NameStatus | 'unknown') => {
    setNameStatus(status);
  }, []);

  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowErrors(true);
    setProblem(null);
    const trimmedEmail = email.trim();
    const trimmedName = citizenName.trim();
    if (!looksLikeEmail(trimmedEmail)) {
      emailInput.current?.focus();
      return;
    }
    if (missing > 0) {
      passwordInput.current?.focus();
      return;
    }
    if (nameStatus === 'invalid' || nameStatus === 'taken' || trimmedName === '') {
      nameInput.current?.focus();
      return;
    }
    if (!countryCode) return;
    if (!captchaToken) {
      setProblem('captcha');
      return;
    }

    setSending(true);
    const { error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        captchaToken,
        emailRedirectTo: emailRedirectTo(),
        data: {
          citizen_name: trimmedName,
          country_code: countryCode,
          locale,
          signup_key: signupKey,
        },
      },
    });
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

    saveSignupDraft({ email: trimmedEmail, citizenName: trimmedName, countryCode, signupKey });
    await navigate({ to: '/verify-email' });
  };

  return (
    <form className={styles.form} noValidate onSubmit={(event) => void submit(event)}>
      <Steps label={copy.steps} steps={[copy.stepData, copy.stepEmail]} current={0} />
      <div className={styles.heading}>
        <h1 className="at-title-1">{copy.title}</h1>
        <p>
          {copy.haveAccount} <Link to="/sign-in">{copy.signIn}</Link>
        </p>
      </div>
      <GoogleSignIn label={copy.google} />
      <Field
        ref={emailInput}
        label={shared.email}
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => {
          setEmail(event.target.value);
        }}
        error={emailError}
      />
      <PasswordField
        ref={passwordInput}
        label={shared.password}
        autoComplete="new-password"
        required
        minLength={minimumPasswordLength}
        value={password}
        onChange={(event) => {
          setPassword(event.target.value);
        }}
        hint={copy.passwordHint}
        error={passwordError}
        success={password !== '' && missing <= 0 ? copy.passwordOk : undefined}
      />
      <CitizenNameField
        ref={nameInput}
        value={citizenName}
        onChange={(value) => {
          setCitizenName(value);
          setForcedNameStatus(null);
        }}
        signupKey={signupKey}
        onStatus={onNameStatus}
        showErrors={showErrors}
        forcedStatus={forcedNameStatus}
      />
      <CountryField value={countryCode} onChange={setCountryCode} showErrors={showErrors} />
      <Turnstile
        ref={turnstile}
        action="signup"
        onToken={setCaptchaToken}
        onUnavailable={() => {
          setCaptchaUnavailable(true);
        }}
      />
      {captchaUnavailable ? <Note tone="error">{shared.turnstileUnavailable}</Note> : null}
      {problem ? <Note tone="error">{shared.problem(problem)}</Note> : null}
      <Button type="submit" size="large" className={styles.submit} disabled={sending}>
        {sending ? copy.sending : copy.submit}
      </Button>
    </form>
  );
}

export function SignUpPage() {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);
  return (
    <SignedOutOnly>
      <AuthLayout story={<Story title={copy.storyTitle}>{copy.storyBody}</Story>}>
        <SignUpForm />
      </AuthLayout>
    </SignedOutOnly>
  );
}
