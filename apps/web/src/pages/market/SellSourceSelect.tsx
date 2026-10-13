import { useId } from 'react';

import styles from '../../features/economy/economy.module.css';
import { useGoodName } from '../../features/economy/goods';
import type { SellSource } from '../../features/market/sellSources';
import { formatNumber, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';

interface SellSourceSelectProps {
  sources: readonly SellSource[];
  selectedId: string;
  onChange: (sourceId: string) => void;
}

/** What to sell, and from where: «Comida Q1 · 18 en tu inventario». */
export function SellSourceSelect({ sources, selectedId, onChange }: SellSourceSelectProps) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const goodName = useGoodName();
  const selectId = useId();
  const label = (source: SellSource) => {
    const units = formatNumber(source.available, locale);
    return source.company
      ? copy.fromCompany(goodName(source.good), units, source.company.name)
      : copy.fromInventory(goodName(source.good), units);
  };
  return (
    <div className={styles.field}>
      <label htmlFor={selectId} className={styles.label}>
        {copy.what}
      </label>
      <select
        id={selectId}
        className={styles.select}
        value={selectedId}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      >
        {sources.map((source) => (
          <option key={source.id} value={source.id}>
            {label(source)}
          </option>
        ))}
      </select>
    </div>
  );
}
