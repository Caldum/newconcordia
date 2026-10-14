import { Button } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { Panel } from '@concordia/atlas/Panel';
import { useState } from 'react';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { foundNewspaper } from '../../features/society/api';
import { useMyNewspaper } from '../../features/society/queries';
import { useMessages } from '../../i18n';

import { messages } from './messages';
import { PublishArticleForm } from './PublishArticleForm';

/** The player's newspaper: founding it, then publishing in it. */
export function NewspaperPanel() {
  const copy = useMessages(messages);
  const paper = useMyNewspaper();
  const [name, setName] = useState('');
  const [checked, setChecked] = useState(false);
  const found = useGameAction((_, value: string) => foundNewspaper(value));
  const valid = name.trim().length >= 3 && name.trim().length <= 60;

  return (
    <Panel className={styles.panel} aria-labelledby="newspaper-title">
      <h2 id="newspaper-title" className="at-title-3">
        {copy.newspaperTitle}
      </h2>
      {paper.data ? (
        <>
          <p>{copy.yourPaper(paper.data.name, paper.data.articles)}</p>
          <PublishArticleForm />
        </>
      ) : paper.isSuccess ? (
        <form
          className={styles.form}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            setChecked(true);
            if (valid) found.run(name.trim());
          }}
        >
          <p className={styles.muted}>{copy.foundHint}</p>
          <Field
            label={copy.name}
            autoComplete="off"
            value={name}
            error={checked && !valid ? copy.nameInvalid : undefined}
            onChange={(event) => {
              setName(event.target.value);
              found.changed();
            }}
          />
          <ActionFeedback
            problem={found.problem}
            copy={copy}
            success={found.succeeded ? copy.founded : null}
          />
          <div>
            <Button type="submit" disabled={found.pending}>
              {copy.found}
            </Button>
          </div>
        </form>
      ) : null}
    </Panel>
  );
}
