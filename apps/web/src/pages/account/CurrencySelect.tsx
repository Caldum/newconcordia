import { useId } from 'react';

import type { Balance } from '../../features/ledger/queries';
import { useCurrencyName } from '../../features/ledger/useCurrencyName';
import { formatMoney, useLocale, useMessages } from '../../i18n';

import styles from './AccountPage.module.css';
import { messages } from './messages';

interface CurrencySelectProps {
  balances: readonly Balance[];
  value: string;
  onChange: (currency: string) => void;
}

/** The currencies the player holds, each with its balance. */
export function CurrencySelect({ balances, value, onChange }: CurrencySelectProps) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const currencyName = useCurrencyName();
  const selectId = useId();
  return (
    <div className={styles.field}>
      <label htmlFor={selectId} className={styles.label}>
        {copy.currency}
      </label>
      <select
        id={selectId}
        className={styles.select}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      >
        {balances.map((balance) => (
          <option key={balance.currency_code} value={balance.currency_code}>
            {`${currencyName(balance.currency_code)} · ${formatMoney(balance.balance, locale)}`}
          </option>
        ))}
      </select>
    </div>
  );
}
