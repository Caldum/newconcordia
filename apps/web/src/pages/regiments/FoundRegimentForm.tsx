import { Button } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { Panel } from '@concordia/atlas/Panel';
import { useState } from 'react';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { foundRegiment } from '../../features/regiments/api';
import { useMessages } from '../../i18n';

import { messages } from './messages';

/** Founding a regiment of the player's country; free, and they lead it. */
export function FoundRegimentForm() {
  const copy = useMessages(messages);
  const [name, setName] = useState('');
  const [checked, setChecked] = useState(false);
  const found = useGameAction((_, value: string) => foundRegiment(value), {
    refreshes: [['regiments']],
  });
  const valid = name.trim().length >= 3 && name.trim().length <= 40;
  return (
    <Panel className={styles.panel} aria-labelledby="found-regiment-title">
      <h2 id="found-regiment-title" className="at-title-3">
        {copy.foundTitle}
      </h2>
      <form
        className={styles.form}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setChecked(true);
          if (valid) found.run(name.trim());
        }}
      >
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
    </Panel>
  );
}
