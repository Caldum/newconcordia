import { Button } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { useState } from 'react';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { issueDecree } from '../../features/politics/api';
import type { NewDecree } from '../../features/politics/api';
import { useMessages } from '../../i18n';

import { messages } from './messages';

/** The president signs an administrative decree: published text, no money. */
export function DecreeForm() {
  const copy = useMessages(messages);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [checked, setChecked] = useState(false);
  const issue = useGameAction((key, decree: NewDecree) => issueDecree(decree, key), {
    refreshes: [['laws']],
    onSuccess: () => {
      setTitle('');
      setBody('');
      setChecked(false);
    },
  });
  const valid = title.trim().length >= 3 && title.trim().length <= 120 && body.trim().length > 0;

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setChecked(true);
        if (!valid) return;
        issue.run({ title: title.trim(), body: body.trim() });
      }}
    >
      <h3 className="at-title-3">{copy.decreeFormTitle}</h3>
      <p className={styles.muted}>{copy.decreeHint}</p>
      <Field
        label={copy.decreeTitle}
        value={title}
        autoComplete="off"
        error={checked && !valid ? copy.decreeMissing : undefined}
        onChange={(event) => {
          setTitle(event.target.value);
          issue.changed();
        }}
      />
      <Field
        label={copy.decreeBody}
        value={body}
        autoComplete="off"
        onChange={(event) => {
          setBody(event.target.value);
          issue.changed();
        }}
      />
      <ActionFeedback
        problem={issue.problem}
        copy={copy}
        success={issue.succeeded ? copy.issued : null}
      />
      <div>
        <Button type="submit" disabled={issue.pending}>
          {copy.issue}
        </Button>
      </div>
    </form>
  );
}
