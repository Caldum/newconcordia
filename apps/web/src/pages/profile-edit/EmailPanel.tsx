import { Button } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { Note } from '@concordia/atlas/Note';
import { Panel } from '@concordia/atlas/Panel';
import { useState } from 'react';

import { authProblem } from '../../features/auth/authErrors';
import type { AuthProblem } from '../../features/auth/authErrors';
import { useAuth } from '../../features/auth/AuthProvider';
import { looksLikeEmail } from '../../features/auth/emailAddress';
import { authMessages } from '../../features/auth/messages';
import { changeEmail } from '../../features/profile/api';
import { useMessages } from '../../i18n';

import styles from './EditProfile.module.css';
import { messages } from './messages';

/** Changing the account email: Supabase confirms it from the new address. */
export function EmailPanel() {
  const copy = useMessages(messages);
  const shared = useMessages(authMessages);
  const auth = useAuth();
  const current = auth.status === 'signedIn' ? (auth.session.user.email ?? '') : '';
  const [email, setEmail] = useState('');
  const [checked, setChecked] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [problem, setProblem] = useState<AuthProblem | null>(null);
  const wanted = email.trim();
  const invalid = !looksLikeEmail(wanted);
  const same = wanted.toLowerCase() === current.toLowerCase();

  const submit = async () => {
    setChecked(true);
    if (invalid || same) return;
    setSending(true);
    setProblem(null);
    const { error } = await changeEmail(wanted);
    setSending(false);
    if (error) {
      setProblem(authProblem(error));
      return;
    }
    setSentTo(wanted);
    setEmail('');
    setChecked(false);
  };

  return (
    <Panel className={styles.panel} aria-labelledby="edit-email">
      <h2 id="edit-email" className="at-title-2">
        {copy.emailTitle}
      </h2>
      {current ? <p className={styles.hint}>{copy.currentEmail(current)}</p> : null}
      <form
        className={styles.form}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <Field
          label={copy.newEmail}
          type="email"
          autoComplete="email"
          value={email}
          error={
            checked && invalid ? copy.emailInvalid : checked && same ? copy.emailSame : undefined
          }
          onChange={(event) => {
            setEmail(event.target.value);
            setSentTo(null);
          }}
        />
        {problem ? <Note tone="error">{shared.problem(problem)}</Note> : null}
        <div role="status">{sentTo ? <Note tone="ok">{copy.emailSent(sentTo)}</Note> : null}</div>
        <div>
          <Button type="submit" disabled={sending}>
            {sending ? copy.sending : copy.saveEmail}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
