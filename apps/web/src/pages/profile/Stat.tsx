import { useId } from 'react';
import type { ReactNode } from 'react';

import styles from './ProfilePage.module.css';

interface StatProps {
  label: string;
  value: string;
  note: string;
  /** A meter under the value, when the figure has a goal. */
  children?: ReactNode;
}

/** One figure of the profile, named by its label. */
export function Stat({ label, value, note, children }: StatProps) {
  const labelId = useId();
  return (
    <div role="group" aria-labelledby={labelId} className={styles.stat}>
      <span id={labelId} className={styles.statLabel}>
        {label}
      </span>
      <span className="at-figure">{value}</span>
      {children}
      <span className={styles.statNote}>{note}</span>
    </div>
  );
}
