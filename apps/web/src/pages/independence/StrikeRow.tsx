import type { Strike } from '../../features/war/queries';
import { formatNumber, useLocale, useMessages } from '../../i18n';

import styles from './IndependenceWar.module.css';
import { messages } from './messages';

interface StrikeRowProps {
  strike: Strike;
  /** Arrived since the last refresh: it slides in. */
  fresh: boolean;
  mine: boolean;
  now: number;
}

/** One strike: who, how much, any injury and how long ago. */
export function StrikeRow({ strike, fresh, mine, now }: StrikeRowProps) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const seconds = Math.max(0, Math.floor((now - Date.parse(strike.created_at)) / 1000));
  return (
    <li
      className={[styles.strike, fresh ? styles.fresh : '', mine ? styles.mine : '']
        .join(' ')
        .trim()}
    >
      <span className={styles.who}>{mine ? copy.you : strike.name}</span>
      <span>
        <span className={styles.damage}>{copy.hit(formatNumber(strike.damage, locale))}</span>
        {strike.health_lost > 0 ? (
          <span className={styles.hurt}> · {copy.hurt(strike.health_lost)}</span>
        ) : null}
      </span>
      <span className={styles.when}>{copy.ago(seconds)}</span>
    </li>
  );
}
