import { Field } from '@concordia/atlas/Field';
import { useId } from 'react';

import styles from '../../features/economy/economy.module.css';
import { ministries } from '../../features/politics/billTerms';
import type { BillDraft, MinistryCode } from '../../features/politics/billTerms';
import { useMessages } from '../../i18n';

import { messages } from './messages';

interface AllocationFieldsProps {
  draft: BillDraft;
  invalid: boolean;
  onChange: (patch: Partial<BillDraft>) => void;
}

/** Which ministry receives funds from the Treasury, and how much Gold and Credit. */
export function AllocationFields({ draft, invalid, onChange }: AllocationFieldsProps) {
  const copy = useMessages(messages);
  const selectId = useId();

  return (
    <>
      <div className={styles.field}>
        <label htmlFor={selectId} className={styles.label}>
          {copy.ministry}
        </label>
        <select
          id={selectId}
          className={styles.select}
          value={draft.ministry}
          onChange={(event) => {
            onChange({ ministry: event.target.value as MinistryCode });
          }}
        >
          {ministries.map((code) => (
            <option key={code} value={code}>
              {copy[`ministry_${code}`]}
            </option>
          ))}
        </select>
      </div>
      <Field
        label={copy.allocationGold}
        inputMode="decimal"
        autoComplete="off"
        value={draft.amount}
        onChange={(event) => {
          onChange({ amount: event.target.value });
        }}
      />
      <Field
        label={copy.allocationCredit}
        hint={copy.allocationHint}
        inputMode="decimal"
        autoComplete="off"
        value={draft.credit}
        error={invalid ? copy.allocationInvalid : undefined}
        onChange={(event) => {
          onChange({ credit: event.target.value });
        }}
      />
    </>
  );
}
