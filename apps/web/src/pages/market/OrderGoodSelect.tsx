import { useId } from 'react';

import styles from '../../features/economy/economy.module.css';
import { useGoodName } from '../../features/economy/goods';
import type { MarketSummary } from '../../features/market/queries';
import { useMessages } from '../../i18n';

import { ordersMessages } from './ordersMessages';

interface OrderGoodSelectProps {
  goods: readonly MarketSummary[];
  selected: string;
  onChange: (good: string) => void;
}

/** The good a buy order asks for. */
export function OrderGoodSelect({ goods, selected, onChange }: OrderGoodSelectProps) {
  const copy = useMessages(ordersMessages);
  const goodName = useGoodName();
  const selectId = useId();
  return (
    <div className={styles.field}>
      <label htmlFor={selectId} className={styles.label}>
        {copy.good}
      </label>
      <select
        id={selectId}
        className={styles.select}
        value={selected}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      >
        {goods.map((row) => (
          <option key={row.good_code} value={row.good_code}>
            {goodName(row.good_code)}
          </option>
        ))}
      </select>
    </div>
  );
}
