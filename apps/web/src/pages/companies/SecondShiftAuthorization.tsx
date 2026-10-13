import { Button } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { useId, useState } from 'react';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import { authorizeSecondShift } from '../../features/economy/api';
import styles from '../../features/economy/economy.module.css';
import type { Employee } from '../../features/economy/queries';
import { parseAmount } from '../../features/ledger/amount';
import { useMessages } from '../../i18n';

import { messages } from './messages';

interface SecondShiftAuthorizationProps {
  companyId: number;
  employees: readonly Employee[];
}

/** Authorizing an employee's second paid shift a day, with its wage, or removing it. */
export function SecondShiftAuthorization({ companyId, employees }: SecondShiftAuthorizationProps) {
  const copy = useMessages(messages);
  const selectId = useId();
  const [name, setName] = useState(employees[0]?.name ?? '');
  const [wageText, setWageText] = useState('');
  const [checked, setChecked] = useState(false);
  const wage = parseAmount(wageText);
  const authorize = useGameAction(
    (_, change: { name: string; wage: number | null }) =>
      authorizeSecondShift(companyId, change.name, change.wage),
    {
      onSuccess: () => {
        setWageText('');
        setChecked(false);
      },
    },
  );

  return (
    <div className={styles.form}>
      <h4 className="at-title-3">{copy.authorizeTitle}</h4>
      <p className={styles.muted}>{copy.authorizeHint}</p>
      <div className={styles.field}>
        <label htmlFor={selectId} className={styles.label}>
          {copy.employee}
        </label>
        <select
          id={selectId}
          className={styles.select}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            authorize.changed();
          }}
        >
          {employees.map((employee) => (
            <option key={employee.name} value={employee.name}>
              {employee.name}
            </option>
          ))}
        </select>
      </div>
      <Field
        label={copy.secondWage}
        value={wageText}
        inputMode="decimal"
        autoComplete="off"
        error={checked && wage === null ? copy.amountInvalid : undefined}
        onChange={(event) => {
          setWageText(event.target.value);
          authorize.changed();
        }}
      />
      <ActionFeedback
        problem={authorize.problem}
        copy={copy}
        success={authorize.succeeded ? copy.done : null}
      />
      <div className={styles.actions}>
        <Button
          disabled={authorize.pending}
          onClick={() => {
            setChecked(true);
            if (wage !== null) authorize.run({ name, wage });
          }}
        >
          {copy.authorize}
        </Button>
        <Button
          variant="secondary"
          disabled={authorize.pending}
          onClick={() => {
            authorize.run({ name, wage: null });
          }}
        >
          {copy.revoke}
        </Button>
      </div>
    </div>
  );
}
