import { CreditIcon, GoldIcon } from '@concordia/atlas/GameIcons';
import { useId } from 'react';

import styles from './AccountPage.module.css';

interface BalanceCardProps {
  gold: boolean;
  label: string;
  value: string;
  /** Money locked in holds, outside the free balance. */
  held: string | null;
  note: string;
}

/** One currency: its name, the free balance, what is held, and what it is for. */
export function BalanceCard({ gold, label, value, held, note }: BalanceCardProps) {
  const labelId = useId();
  return (
    <div role="group" aria-labelledby={labelId} className={styles.balance}>
      <span id={labelId} className={styles.balanceLabel}>
        {gold ? <GoldIcon /> : <CreditIcon />}
        {label}
      </span>
      <span className="at-figure">{value}</span>
      {held === null ? null : <span className={styles.held}>{held}</span>}
      <span className={styles.note}>{note}</span>
    </div>
  );
}
