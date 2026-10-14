import { useId } from 'react';

import styles from '../../features/economy/economy.module.css';
import { useCountryName } from '../../features/world/useNames';
import { useMessages } from '../../i18n';

import { messages } from './messages';

interface MarketChoiceProps {
  markets: readonly string[];
  selected: string;
  onChange: (market: string) => void;
}

/** Which country's market: shown only when the player holds a license for another one. */
export function MarketChoice({ markets, selected, onChange }: MarketChoiceProps) {
  const copy = useMessages(messages);
  const countryName = useCountryName();
  const selectId = useId();
  if (markets.length < 2) return null;
  return (
    <div className={styles.field}>
      <label htmlFor={selectId} className={styles.label}>
        {copy.market}
      </label>
      <select
        id={selectId}
        className={styles.select}
        value={selected}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      >
        {markets.map((market) => (
          <option key={market} value={market}>
            {countryName(market)}
          </option>
        ))}
      </select>
    </div>
  );
}
