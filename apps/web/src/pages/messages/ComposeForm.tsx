import { Button } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { Panel } from '@concordia/atlas/Panel';
import { useId, useState } from 'react';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { sendMessage } from '../../features/society/api';
import type { NewMessage } from '../../features/society/api';
import { useMessages } from '../../i18n';

import { messages } from './messages';

/** Writing to a citizen; the open conversation fills the recipient. */
export function ComposeForm({ to }: { to: string | null }) {
  const copy = useMessages(messages);
  const bodyId = useId();
  const [typed, setTyped] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [checked, setChecked] = useState(false);
  const recipient = typed ?? to ?? '';
  const send = useGameAction((key, message: NewMessage) => sendMessage(message, key), {
    onSuccess: () => {
      setBody('');
      setChecked(false);
    },
  });
  const valid = recipient.trim() !== '' && body.trim().length > 0 && body.length <= 2000;

  return (
    <Panel className={styles.panel} aria-labelledby="compose-title">
      <form
        className={styles.form}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setChecked(true);
          if (valid) send.run({ to: recipient.trim(), body: body.trim() });
        }}
      >
        <h2 id="compose-title" className="at-title-3">
          {copy.composeTitle}
        </h2>
        <Field
          label={copy.to}
          hint={copy.toHint}
          autoComplete="off"
          value={recipient}
          onChange={(event) => {
            setTyped(event.target.value);
            send.changed();
          }}
        />
        <div className={styles.field}>
          <label htmlFor={bodyId} className={styles.label}>
            {copy.body}
          </label>
          <textarea
            id={bodyId}
            className={styles.select}
            style={{ height: 'auto', minHeight: '6rem', padding: '12px 14px' }}
            value={body}
            aria-invalid={checked && !valid}
            onChange={(event) => {
              setBody(event.target.value);
              send.changed();
            }}
          />
        </div>
        {checked && !valid ? <p className={styles.muted}>{copy.invalid}</p> : null}
        <ActionFeedback
          problem={send.problem}
          copy={copy}
          success={send.succeeded ? copy.sent : null}
        />
        <div>
          <Button type="submit" disabled={send.pending}>
            {copy.send}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
