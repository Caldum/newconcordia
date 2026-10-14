import { Button } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { useId, useState } from 'react';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { publishArticle } from '../../features/society/api';
import type { NewArticle } from '../../features/society/api';
import { useMessages } from '../../i18n';

import { messages } from './messages';

/** Writing and publishing an article in the player's newspaper. */
export function PublishArticleForm() {
  const copy = useMessages(messages);
  const bodyId = useId();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [checked, setChecked] = useState(false);
  const publish = useGameAction((key, article: NewArticle) => publishArticle(article, key), {
    refreshes: [['press']],
    onSuccess: () => {
      setTitle('');
      setBody('');
      setChecked(false);
    },
  });
  const valid =
    title.trim().length >= 3 &&
    title.trim().length <= 120 &&
    body.trim().length > 0 &&
    body.length <= 8000;

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setChecked(true);
        if (valid) publish.run({ title: title.trim(), body: body.trim() });
      }}
    >
      <Field
        label={copy.articleTitle}
        autoComplete="off"
        value={title}
        onChange={(event) => {
          setTitle(event.target.value);
          publish.changed();
        }}
      />
      <div className={styles.field}>
        <label htmlFor={bodyId} className={styles.label}>
          {copy.articleBody}
        </label>
        <textarea
          id={bodyId}
          className={styles.select}
          style={{ height: 'auto', minHeight: '10rem', padding: '12px 14px' }}
          value={body}
          aria-invalid={checked && !valid}
          onChange={(event) => {
            setBody(event.target.value);
            publish.changed();
          }}
        />
      </div>
      {checked && !valid ? <p className={styles.muted}>{copy.articleInvalid}</p> : null}
      <ActionFeedback
        problem={publish.problem}
        copy={copy}
        success={publish.succeeded ? copy.published : null}
      />
      <div>
        <Button type="submit" disabled={publish.pending}>
          {copy.publish}
        </Button>
      </div>
    </form>
  );
}
