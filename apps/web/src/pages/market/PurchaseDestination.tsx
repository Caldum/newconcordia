import { useId } from 'react';

import styles from '../../features/economy/economy.module.css';
import { useMyCompanies } from '../../features/economy/queries';
import { useMessages } from '../../i18n';

import { messages } from './messages';

interface PurchaseDestinationProps {
  /** An own company's depot; null for the player's inventory. */
  companyId: number | null;
  onChange: (companyId: number | null) => void;
}

/** Where the bought units go: the inventory or the depot of one of the player's companies. */
export function PurchaseDestination({ companyId, onChange }: PurchaseDestinationProps) {
  const copy = useMessages(messages);
  const companies = useMyCompanies();
  const selectId = useId();
  return (
    <div className={styles.field}>
      <label htmlFor={selectId} className={styles.label}>
        {copy.destination}
      </label>
      <select
        id={selectId}
        className={styles.select}
        value={companyId === null ? '' : String(companyId)}
        onChange={(event) => {
          onChange(event.target.value ? Number(event.target.value) : null);
        }}
      >
        <option value="">{copy.inventory}</option>
        {companies.data?.map((company) => (
          <option key={company.id} value={String(company.id)}>
            {copy.depot(company.name)}
          </option>
        ))}
      </select>
    </div>
  );
}
