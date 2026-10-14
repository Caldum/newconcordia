import { Button } from '@concordia/atlas/Button';
import { Note } from '@concordia/atlas/Note';
import { Panel } from '@concordia/atlas/Panel';
import { useState } from 'react';

import { signOutOtherSessions, updatePassword } from '../../features/auth/api';
import { authProblem } from '../../features/auth/authErrors';
import type { AuthProblem } from '../../features/auth/authErrors';
import { useAuth } from '../../features/auth/AuthProvider';
import { authMessages } from '../../features/auth/messages';
import { PasswordField } from '../../features/auth/PasswordField';
import { minimumPasswordLength } from '../../features/auth/passwordRules';
import { useMessages } from '../../i18n';

import styles from './EditProfile.module.css';
import { messages } from './messages';

/** A new password; the sessions on other devices are closed after it. */
export function PasswordPanel() {
  const copy = useMessages(messages);
  const shared = useMessages(authMessages);
  const auth = useAuth();
  const email = auth.status === 'signedIn' ? (auth.session.user.email ?? '') : '';
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [checked, setChecked] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [problem, setProblem] = useState<AuthProblem | null>(null);
  const tooShort = password.length < minimumPasswordLength;
  const mismatch = repeat !== password;

  const submit = async () => {
    setChecked(true);
    if (tooShort || mismatch) return;
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
    setPassword('');
    setRepeat('');
    setChecked(false);
  };

  return (
    <Panel className={styles.panel} aria-labelledby="edit-password">
      <h2 id="edit-password" className="at-title-2">
        {copy.passwordTitle}
      </h2>
      <form
        className={styles.form}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        {/* The account name lets password managers save the new password for the right login. */}
        <input type="hidden" name="username" autoComplete="username" value={email} />
        <PasswordField
          label={copy.newPassword}
          autoComplete="new-password"
          value={password}
          hint={copy.passwordRules}
          error={checked && tooShort ? copy.tooShort : undefined}
          onChange={(event) => {
            setPassword(event.target.value);
            setDone(false);
          }}
        />
        <PasswordField
          label={copy.repeat}
          autoComplete="new-password"
          value={repeat}
          error={checked && !tooShort && mismatch ? copy.mismatch : undefined}
          onChange={(event) => {
            setRepeat(event.target.value);
            setDone(false);
          }}
        />
        {problem ? <Note tone="error">{shared.problem(problem)}</Note> : null}
        <div role="status">{done ? <Note tone="ok">{copy.passwordSaved}</Note> : null}</div>
        <div>
          <Button type="submit" disabled={sending}>
            {sending ? copy.sending : copy.savePassword}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
