import { Panel } from '@concordia/atlas/Panel';

import type { CitizenRecord } from '../../features/admin/queries';
import { formatDateTime, useLocale, useMessages } from '../../i18n';

import { abuseMessages } from './abuseMessages';
import styles from './AdminPage.module.css';
import { citizenMessages } from './citizenMessages';

/** Anti-abuse signals that involve the citizen (shared addresses, self-trading, large transfers). */
export function CitizenSignals({ signals }: { signals: CitizenRecord['signals'] }) {
  const copy = useMessages(citizenMessages);
  const kinds = useMessages(abuseMessages);
  const { locale } = useLocale();
  const kindText = (kind: string) => {
    const text = (kinds as Record<string, unknown>)[`kind_${kind}`];
    return typeof text === 'string' ? text : kind;
  };
  return (
    <Panel className={styles.section} aria-labelledby="citizen-signals">
      <h2 id="citizen-signals" className="at-title-3">
        {copy.signalsTitle}
      </h2>
      {signals.length === 0 ? <p>{copy.noSignals}</p> : null}
      <ul className={styles.list}>
        {signals.map((signal) => (
          <li key={signal.signal_id}>
            <span>{copy.signalLine(kindText(signal.kind), signal.other_name)}</span>
            <span className={styles.meta}>
              {formatDateTime(signal.created_at, locale)} ·{' '}
              {signal.reviewed ? copy.reviewed : copy.open}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
