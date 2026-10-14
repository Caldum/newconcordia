import { Button } from '@concordia/atlas/Button';
import { useId, useState } from 'react';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { setCarePolicy } from '../../features/health/api';
import type { CarePolicy } from '../../features/health/api';
import { useCarePolicy } from '../../features/health/queries';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { useMessages } from '../../i18n';

import { messages } from './messages';

const policies: readonly CarePolicy[] = ['universal', 'nationals', 'non_enemies', 'allies'];

/** The Health minister sets who the country's hospitals treat, at once. */
export function CarePolicyForm() {
  const copy = useMessages(messages);
  const citizen = useCurrentCitizen();
  const current = useCarePolicy(citizen.country_code).data?.policy ?? 'universal';
  const selectId = useId();
  const [chosen, setChosen] = useState<CarePolicy | null>(null);
  const policy = chosen ?? current;
  const save = useGameAction((_, value: CarePolicy) => setCarePolicy(value), {
    refreshes: [['health']],
  });

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        save.run(policy);
      }}
    >
      <h3 className="at-title-3">{copy.policyTitle}</h3>
      <div className={styles.field}>
        <label htmlFor={selectId} className={styles.label}>
          {copy.policy}
        </label>
        <select
          id={selectId}
          className={styles.select}
          value={policy}
          onChange={(event) => {
            setChosen(event.target.value as CarePolicy);
            save.changed();
          }}
        >
          {policies.map((code) => (
            <option key={code} value={code}>
              {copy[`policy_${code}`]}
            </option>
          ))}
        </select>
      </div>
      <ActionFeedback
        problem={save.problem}
        copy={copy}
        success={save.succeeded ? copy.policySet : null}
      />
      <div>
        <Button type="submit" variant="secondary" disabled={save.pending}>
          {copy.setPolicy}
        </Button>
      </div>
    </form>
  );
}
