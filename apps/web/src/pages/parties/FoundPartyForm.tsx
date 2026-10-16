import { Button } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { Panel } from '@concordia/atlas/Panel';
import { useState } from 'react';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { foundParty } from '../../features/politics/api';
import type { NewParty } from '../../features/politics/api';
import { partyDescriptionMax, partyName } from '../../features/politics/partyName';
import { useGoldPrice } from '../../features/prices/useGoldPrice';
import { useMessages } from '../../i18n';

import { messages } from './messages';

/** Founding a party: its name and motto, for its GOLD price. */
export function FoundPartyForm() {
  const copy = useMessages(messages);
  const price = useGoldPrice('party_founding');
  const [nameText, setNameText] = useState('');
  const [description, setDescription] = useState('');
  const [checked, setChecked] = useState(false);
  const found = useGameAction((key, party: NewParty) => foundParty(party, key), {
    refreshes: [['parties']],
  });
  const name = partyName(nameText);

  /** Any change is a new request: a new key, and the last outcome no longer applies. */
  const edit = (apply: () => void) => {
    apply();
    found.changed();
  };

  return (
    <Panel className={styles.panel} aria-labelledby="found-party-title">
      <form
        className={styles.form}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setChecked(true);
          if (name === null) return;
          found.run({ name, description: description.trim() });
        }}
      >
        <h2 id="found-party-title" className="at-title-3">
          {copy.foundTitle}
        </h2>
        <p className={styles.muted}>{copy.foundIntro(price)}</p>
        <Field
          label={copy.name}
          hint={copy.nameHint}
          value={nameText}
          maxLength={40}
          autoComplete="off"
          error={checked && name === null ? copy.nameInvalid : undefined}
          onChange={(event) => {
            edit(() => {
              setNameText(event.target.value);
            });
          }}
        />
        <Field
          label={copy.description}
          hint={copy.descriptionHint}
          value={description}
          maxLength={partyDescriptionMax}
          autoComplete="off"
          onChange={(event) => {
            edit(() => {
              setDescription(event.target.value);
            });
          }}
        />
        <ActionFeedback
          problem={found.problem}
          copy={copy}
          success={found.succeeded && found.variables ? copy.founded(found.variables.name) : null}
        />
        <div>
          <Button type="submit" size="large" disabled={found.pending}>
            {copy.found(price.price)}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
