import { Button } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { Panel } from '@concordia/atlas/Panel';
import { useId, useState } from 'react';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { appoint } from '../../features/politics/api';
import type { Appointment } from '../../features/politics/api';
import { useMessages } from '../../i18n';

import { messages } from './messages';
import { useOfficeName } from './useOfficeName';

const appointable: readonly Appointment['office'][] = [
  'economy',
  'defense',
  'foreign_affairs',
  'health',
  'development',
  'central_bank_governor',
];

/** The president names a minister or the governor by citizen name. */
export function AppointForm() {
  const copy = useMessages(messages);
  const officeName = useOfficeName();
  const officeId = useId();
  const [office, setOffice] = useState<Appointment['office']>('economy');
  const [name, setName] = useState('');
  const [checked, setChecked] = useState(false);
  const act = useGameAction((_, appointment: Appointment) => appoint(appointment), {
    refreshes: [['government']],
    onSuccess: () => {
      setName('');
      setChecked(false);
    },
  });
  const label = (code: Appointment['office']) =>
    officeName(code === 'central_bank_governor' ? code : `minister_${code}`);

  return (
    <Panel className={styles.panel} aria-labelledby="appoint-title">
      <form
        className={styles.form}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setChecked(true);
          if (!name.trim()) return;
          act.run({ office, name: name.trim() });
        }}
      >
        <h2 id="appoint-title" className="at-title-3">
          {copy.appointTitle}
        </h2>
        <p className={styles.muted}>{copy.appointIntro}</p>
        <div className={styles.field}>
          <label htmlFor={officeId} className={styles.label}>
            {copy.office}
          </label>
          <select
            id={officeId}
            className={styles.select}
            value={office}
            onChange={(event) => {
              setOffice(event.target.value as Appointment['office']);
              act.changed();
            }}
          >
            {appointable.map((code) => (
              <option key={code} value={code}>
                {label(code)}
              </option>
            ))}
          </select>
        </div>
        <Field
          label={copy.citizen}
          hint={copy.citizenHint}
          value={name}
          autoComplete="off"
          error={checked && !name.trim() ? copy.citizenMissing : undefined}
          onChange={(event) => {
            setName(event.target.value);
            act.changed();
          }}
        />
        <ActionFeedback
          problem={act.problem}
          copy={copy}
          success={act.succeeded && act.variables ? copy.appointed(act.variables.name) : null}
        />
        <div>
          <Button type="submit" disabled={act.pending}>
            {copy.appoint}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
