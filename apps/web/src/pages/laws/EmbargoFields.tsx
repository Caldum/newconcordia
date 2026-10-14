import { useId } from 'react';

import styles from '../../features/economy/economy.module.css';
import type { BillDraft, EmbargoKind } from '../../features/politics/billTerms';
import { useMessages } from '../../i18n';

import { CountryField } from './CountryField';
import { messages } from './messages';

interface EmbargoFieldsProps {
  draft: BillDraft;
  onChange: (patch: Partial<BillDraft>) => void;
}

/** The country an embargo is for and whether it covers every good or only weapons. */
export function EmbargoFields({ draft, onChange }: EmbargoFieldsProps) {
  const copy = useMessages(messages);
  const kindId = useId();

  return (
    <>
      <CountryField
        label={copy.country}
        value={draft.country ?? ''}
        onChange={(country) => {
          onChange({ country });
        }}
      />
      <div className={styles.field}>
        <label htmlFor={kindId} className={styles.label}>
          {copy.embargoKind}
        </label>
        <select
          id={kindId}
          className={styles.select}
          value={draft.embargo}
          onChange={(event) => {
            onChange({ embargo: event.target.value as EmbargoKind });
          }}
        >
          <option value="economic">{copy.embargo_economic}</option>
          <option value="arms">{copy.embargo_arms}</option>
        </select>
      </div>
    </>
  );
}
