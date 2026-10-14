import { Button } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { Panel } from '@concordia/atlas/Panel';
import { useId, useState } from 'react';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import { startIndependenceWar } from '../../features/admin/api';
import type { IndependenceWarStart } from '../../features/admin/api';
import styles from '../../features/economy/economy.module.css';
import { parseUnits } from '../../features/market/units';
import { useCountryName } from '../../features/world/useNames';
import { useWorld } from '../../features/world/useWorld';
import { useMessages } from '../../i18n';

import { independenceMessages } from './independenceMessages';

/** Opening a sandbox independence war for a country in play, with a damage target. */
export function IndependenceSection() {
  const copy = useMessages(independenceMessages);
  const countryName = useCountryName();
  const world = useWorld();
  const selectId = useId();
  const countries = [...(world.data?.countries.values() ?? [])]
    .filter((c) => c.is_active)
    .map((c) => c.code)
    .sort((a, b) => countryName(a).localeCompare(countryName(b)));
  const [chosen, setChosen] = useState<string | null>(null);
  const [targetText, setTargetText] = useState('');
  const [checked, setChecked] = useState(false);
  const country = chosen ?? countries[0] ?? null;
  const target = parseUnits(targetText);
  const start = useGameAction((_, request: IndependenceWarStart) => startIndependenceWar(request));

  return (
    <Panel className={styles.panel} aria-labelledby="independence-admin-title">
      <form
        className={styles.form}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setChecked(true);
          if (!country || target <= 0) return;
          start.run({ country, target });
        }}
      >
        <h2 id="independence-admin-title" className="at-title-3">
          {copy.title}
        </h2>
        <p className={styles.muted}>{copy.hint}</p>
        <div className={styles.field}>
          <label htmlFor={selectId} className={styles.label}>
            {copy.country}
          </label>
          <select
            id={selectId}
            className={styles.select}
            value={country ?? ''}
            onChange={(event) => {
              setChosen(event.target.value);
              start.changed();
            }}
          >
            {countries.map((code) => (
              <option key={code} value={code}>
                {countryName(code)}
              </option>
            ))}
          </select>
        </div>
        <Field
          label={copy.target}
          inputMode="numeric"
          autoComplete="off"
          value={targetText}
          error={checked && target <= 0 ? copy.targetInvalid : undefined}
          onChange={(event) => {
            setTargetText(event.target.value);
            start.changed();
          }}
        />
        <ActionFeedback
          problem={start.problem}
          copy={copy}
          success={start.succeeded ? copy.started : null}
        />
        <div>
          <Button type="submit" disabled={start.pending}>
            {copy.start}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
