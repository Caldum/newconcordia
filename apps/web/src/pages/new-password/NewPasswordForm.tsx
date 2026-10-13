import { Button, buttonClassName } from '@concordia/atlas/Button';
import { Note } from '@concordia/atlas/Note';
import { Steps } from '@concordia/atlas/Steps';
import { Link } from '@tanstack/react-router';
import { useRef, useState } from 'react';
import type { SubmitEvent } from 'react';

import { signOutOtherSessions, updatePassword } from '../../features/auth/api';
import { authProblem } from '../../features/auth/authErrors';
import type { AuthProblem } from '../../features/auth/authErrors';
import styles from '../../features/auth/AuthForm.module.css';
import { authMessages } from '../../features/auth/messages';
import { PasswordField } from '../../features/auth/PasswordField';
import { minimumPasswordLength } from '../../features/auth/passwordRules';
import { useMessages } from '../../i18n';

import { messages } from './messages';

export function NewPasswordForm({ email }: { email: string }) {
  const copy = useMessages(messages);
  const shared = useMessages(authMessages);
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [problem, setProblem] = useState<AuthProblem | null>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  const repeatInput = useRef<HTMLInputElement>(null);

  const tooShort = password.length < minimumPasswordLength;
  const mismatch = repeat !== password;

  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowErrors(true);
    if (tooShort) {
      passwordInput.current?.focus();
      return;
    }
    if (mismatch) {
      repeatInput.current?.focus();
      return;
    }
    setSending(true);
    setProblem(null);
    const { error } = await updatePassword(password);
    if (error) {
      setSending(false);
      setProblem(authProblem(error));
      return;
    }
    // Whoever had the old password loses the sessions it opened.
    await signOutOtherSessions();
    setSending(false);
    setDone(true);
  };

  if (done) {
    return (
      <div className={styles.form}>
        <Steps label={copy.steps} steps={[copy.stepEmail, copy.stepPassword]} current={2} />
        <div className={styles.heading} role="status">
          <h1 className="at-title-1">{copy.doneTitle}</h1>
          <p>{copy.doneBody}</p>
        </div>
        <Link to="/" className={`${buttonClassName({ size: 'large' })} ${styles.submit}`}>
          {copy.enter}
        </Link>
      </div>
    );
  }

  return (
    <form className={styles.form} noValidate onSubmit={(event) => void submit(event)}>
      <Steps label={copy.steps} steps={[copy.stepEmail, copy.stepPassword]} current={1} />
      <div className={styles.heading}>
        <h1 className="at-title-1">{copy.title}</h1>
        <p>{copy.forAccount(email)}</p>
      </div>
      {/* The account name lets password managers save the new password for the right login. */}
      <input type="hidden" name="username" autoComplete="username" value={email} />
      <PasswordField
        ref={passwordInput}
        label={copy.newPassword}
        autoComplete="new-password"
        required
        value={password}
        onChange={(event) => {
          setPassword(event.target.value);
        }}
        hint={copy.rules}
        error={showErrors && tooShort ? copy.tooShort : undefined}
      />
      <PasswordField
        ref={repeatInput}
        label={copy.repeat}
        autoComplete="new-password"
        required
        value={repeat}
        onChange={(event) => {
          setRepeat(event.target.value);
        }}
        error={showErrors && !tooShort && mismatch ? copy.mismatch : undefined}
      />
      {problem ? <Note tone="error">{shared.problem(problem)}</Note> : null}
      <Button type="submit" size="large" className={styles.submit} disabled={sending}>
        {sending ? copy.sending : copy.submit}
      </Button>
    </form>
  );
}
