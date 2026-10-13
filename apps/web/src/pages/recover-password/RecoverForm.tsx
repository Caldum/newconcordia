import { Button } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { Note } from '@concordia/atlas/Note';
import { Steps } from '@concordia/atlas/Steps';
import { Link, useNavigate } from '@tanstack/react-router';
import { useRef, useState } from 'react';
import type { SubmitEvent } from 'react';

import { sendPasswordRecovery } from '../../features/auth/api';
import { authProblem } from '../../features/auth/authErrors';
import type { AuthProblem } from '../../features/auth/authErrors';
import styles from '../../features/auth/AuthForm.module.css';
import { authMessages } from '../../features/auth/messages';
import { readRecoverEmail, saveRecoverEmail } from '../../features/auth/recoverEmail';
import { Turnstile } from '../../features/auth/Turnstile';
import type { TurnstileHandle } from '../../features/auth/Turnstile';
import { useMessages } from '../../i18n';

import { messages } from './messages';

export function RecoverForm() {
  const copy = useMessages(messages);
  const shared = useMessages(authMessages);
  const navigate = useNavigate();
  const [email, setEmail] = useState(() => readRecoverEmail() ?? '');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaUnavailable, setCaptchaUnavailable] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState<AuthProblem | null>(null);
  const turnstile = useRef<TurnstileHandle>(null);

  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const address = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setEmailError(true);
      return;
    }
    if (!captchaToken) {
      setProblem('captcha');
      return;
    }
    setSending(true);
    setProblem(null);
    const { error } = await sendPasswordRecovery(address, captchaToken);
    turnstile.current?.reset();
    setSending(false);
    if (error) {
      setProblem(authProblem(error));
      return;
    }
    saveRecoverEmail(address);
    await navigate({ to: '/recover-password/sent' });
  };

  return (
    <form className={styles.form} noValidate onSubmit={(event) => void submit(event)}>
      <p className={styles.aside}>
        <Link to="/sign-in">{copy.backToSignIn}</Link>
      </p>
      <Steps label={copy.steps} steps={[copy.stepEmail, copy.stepPassword]} current={0} />
      <div className={styles.heading}>
        <h1 className="at-title-1">{copy.title}</h1>
        <p>{copy.intro}</p>
      </div>
      <Field
        label={shared.email}
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => {
          setEmail(event.target.value);
          setEmailError(false);
        }}
        error={emailError ? shared.problem('emailInvalid') : undefined}
      />
      <Turnstile
        ref={turnstile}
        action="recover"
        appearance="interaction-only"
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
      <p className={styles.aside}>{copy.googleNote}</p>
    </form>
  );
}
