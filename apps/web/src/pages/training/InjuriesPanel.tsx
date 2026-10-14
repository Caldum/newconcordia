import { Panel } from '@concordia/atlas/Panel';

import styles from '../../features/economy/economy.module.css';
import { useMyInjuries } from '../../features/training/queries';
import { formatDateTime, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';

/** The player's latest injuries from training and combat. */
export function InjuriesPanel() {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const injuries = useMyInjuries();
  const rows = injuries.data ?? [];

  return (
    <Panel className={styles.panel} aria-labelledby="injuries-title">
      <h2 id="injuries-title" className="at-title-3">
        {copy.injuriesTitle}
      </h2>
      {injuries.isSuccess && rows.length === 0 ? (
        <p className={styles.muted}>{copy.noInjuries}</p>
      ) : null}
      <ul className={styles.recipes}>
        {rows.map((injury) => (
          <li key={`${injury.created_at}-${String(injury.health_after)}`}>
            <span>
              {copy.injuryLine(
                copy[`cause_${injury.cause}`],
                injury.health_lost,
                injury.health_after,
              )}
            </span>
            <span className={styles.muted}>{formatDateTime(injury.created_at, locale)}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
