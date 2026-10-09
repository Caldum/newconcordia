import { Button, buttonClassName } from '@concordia/atlas/Button';
import { Note } from '@concordia/atlas/Note';
import { Steps } from '@concordia/atlas/Steps';
import { Link } from '@tanstack/react-router';
import { useRef, useState } from 'react';
import type { SubmitEvent } from 'react';

import { authProblem } from '../../features/auth/authErrors';
import type { AuthProblem } from '../../features/auth/authErrors';
import styles from '../../features/auth/AuthForm.module.css';
import { AuthLayout } from '../../features/auth/AuthLayout';
import { useAuth } from '../../features/auth/AuthProvider';
import { authMessages } from '../../features/auth/messages';
import { PasswordField } from '../../features/auth/PasswordField';
import { Story } from '../../features/auth/Story';
import { defineMessages, useMessages } from '../../i18n';
import { supabase } from '../../lib/supabase';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { minimumPasswordLength } from '../sign-up/SignUpPage';

const messages = defineMessages({
  es: {
    documentTitle: 'Contraseña nueva · Concordia',
    storyTitle: 'Tu ciudadano te espera.',
    storyBody: 'Recuperas el acceso en dos pasos y no pierdes nada mientras tanto.',
    steps: 'Pasos para recuperar el acceso',
    stepEmail: 'Tu correo',
    stepPassword: 'Contraseña nueva',
    title: 'Crea una contraseña nueva',
    forAccount: (email: string) => `Para ${email}`,
    newPassword: 'Contraseña nueva',
    rules: 'Al menos 10 caracteres y distinta de la anterior.',
    tooShort: 'Usa al menos 10 caracteres.',
    repeat: 'Repite la contraseña',
    mismatch: 'Las dos contraseñas no coinciden.',
    submit: 'Guardar contraseña',
    sending: 'Guardando…',
    doneTitle: 'Ya puedes entrar',
    doneBody:
      'Guardamos tu contraseña nueva y cerramos las sesiones abiertas en otros dispositivos.',
    enter: 'Entrar a Concordia',
    noSession: 'Para crear una contraseña nueva abre el enlace del correo. Si venció, pide otro.',
    askAgain: 'Pedir otro enlace',
  },
  en: {
    documentTitle: 'New password · Concordia',
    storyTitle: 'Your citizen is waiting.',
    storyBody: 'You get access back in two steps and lose nothing in the meantime.',
    steps: 'Steps to recover access',
    stepEmail: 'Your email',
    stepPassword: 'New password',
    title: 'Create a new password',
    forAccount: (email: string) => `For ${email}`,
    newPassword: 'New password',
    rules: 'At least 10 characters and different from the old one.',
    tooShort: 'Use at least 10 characters.',
    repeat: 'Repeat the password',
    mismatch: 'The two passwords do not match.',
    submit: 'Save password',
    sending: 'Saving…',
    doneTitle: 'You can come in now',
    doneBody: 'We saved your new password and closed the sessions open on other devices.',
    enter: 'Enter Concordia',
    noSession:
      'To create a new password, open the link in the email. If it expired, ask for another.',
    askAgain: 'Ask for another link',
  },
});

function NewPasswordForm({ email }: { email: string }) {
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
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setSending(false);
      setProblem(authProblem(error));
      return;
    }
    // Whoever had the old password loses the sessions it opened.
    await supabase.auth.signOut({ scope: 'others' });
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

export function NewPasswordPage() {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);
  const auth = useAuth();

  return (
    <AuthLayout story={<Story title={copy.storyTitle}>{copy.storyBody}</Story>}>
      {auth.status === 'signedIn' ? (
        <NewPasswordForm email={auth.session.user.email ?? ''} />
      ) : auth.status === 'signedOut' ? (
        <div className={styles.form}>
          <h1 className="at-title-1">{copy.title}</h1>
          <Note tone="info">{copy.noSession}</Note>
          <Link to="/recover-password" className={buttonClassName({ variant: 'secondary' })}>
            {copy.askAgain}
          </Link>
        </div>
      ) : null}
    </AuthLayout>
  );
}
