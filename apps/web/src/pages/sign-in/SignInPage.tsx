import { Button } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { Note } from '@concordia/atlas/Note';
import { Link, useNavigate } from '@tanstack/react-router';
import { useRef, useState } from 'react';
import type { SubmitEvent } from 'react';

import { authProblem } from '../../features/auth/authErrors';
import type { AuthProblem } from '../../features/auth/authErrors';
import styles from '../../features/auth/AuthForm.module.css';
import { AuthLayout } from '../../features/auth/AuthLayout';
import { GoogleSignIn } from '../../features/auth/GoogleButton';
import { SignedOutOnly } from '../../features/auth/guards';
import { authMessages } from '../../features/auth/messages';
import { PasswordField } from '../../features/auth/PasswordField';
import { Story } from '../../features/auth/Story';
import { Turnstile } from '../../features/auth/Turnstile';
import type { TurnstileHandle } from '../../features/auth/Turnstile';
import { useMessages } from '../../i18n';
import { remembersSession, setRememberSession } from '../../lib/sessionStorage';
import { supabase } from '../../lib/supabase';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import { messages } from './messages';

function SignInForm() {
  const copy = useMessages(messages);
  const shared = useMessages(authMessages);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(remembersSession);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaUnavailable, setCaptchaUnavailable] = useState(false);
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState<AuthProblem | 'missing' | null>(null);
  const turnstile = useRef<TurnstileHandle>(null);

  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (email.trim() === '' || password === '') {
      setProblem('missing');
      return;
    }
    if (!captchaToken) {
      setProblem('captcha');
      return;
    }
    setSending(true);
    setProblem(null);
    // Decides where Supabase stores the session it is about to create.
    setRememberSession(remember);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
      options: { captchaToken },
    });
    turnstile.current?.reset();
    setSending(false);
    if (error) {
      setProblem(authProblem(error));
      return;
    }
    await navigate({ to: '/' });
  };

  return (
    <form className={styles.form} noValidate onSubmit={(event) => void submit(event)}>
      <div className={styles.heading}>
        <h1 className="at-title-1">{copy.title}</h1>
        <p>
          {copy.firstTime} <Link to="/sign-up">{copy.signUp}</Link>
        </p>
      </div>
      <GoogleSignIn />
      <Field
        label={shared.email}
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => {
          setEmail(event.target.value);
        }}
      />
      <div>
        <PasswordField
          label={shared.password}
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
          }}
        />
        <p className={styles.aside}>
          <Link to="/recover-password" className={styles.inlineLink}>
            {copy.forgot}
          </Link>
        </p>
      </div>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={remember}
          onChange={(event) => {
            setRemember(event.target.checked);
          }}
        />
        {copy.remember}
      </label>
      <Turnstile
        ref={turnstile}
        action="login"
        appearance="interaction-only"
        onToken={setCaptchaToken}
        onUnavailable={() => {
          setCaptchaUnavailable(true);
        }}
      />
      {captchaUnavailable ? <Note tone="error">{shared.turnstileUnavailable}</Note> : null}
      {problem ? (
        <Note tone="error">{problem === 'missing' ? copy.missing : shared.problem(problem)}</Note>
      ) : null}
      <Button type="submit" size="large" className={styles.submit} disabled={sending}>
        {sending ? copy.sending : copy.submit}
      </Button>
    </form>
  );
}

export function SignInPage() {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);
  return (
    <SignedOutOnly>
      <AuthLayout story={<Story title={copy.storyTitle}>{copy.storyBody}</Story>}>
        <SignInForm />
      </AuthLayout>
    </SignedOutOnly>
  );
}
