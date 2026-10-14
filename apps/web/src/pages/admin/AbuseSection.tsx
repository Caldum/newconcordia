import { Panel } from '@concordia/atlas/Panel';

import { useAbuseSignals } from '../../features/admin/queries';
import styles from '../../features/economy/economy.module.css';
import { useMessages } from '../../i18n';

import { abuseMessages } from './abuseMessages';
import { AbuseSignalItem } from './AbuseSignalItem';

/** Open anti-abuse signals: who, what and when; never addresses. Reviewing one is audited. */
export function AbuseSection() {
  const copy = useMessages(abuseMessages);
  const signals = useAbuseSignals(true);
  const rows = signals.data ?? [];

  return (
    <Panel className={styles.panel} aria-labelledby="abuse-title">
      <h2 id="abuse-title" className="at-title-3">
        {copy.title}
      </h2>
      <p className={styles.muted}>{copy.hint}</p>
      {signals.isSuccess && rows.length === 0 ? <p className={styles.muted}>{copy.none}</p> : null}
      <ul className={styles.recipes}>
        {rows.map((signal) => (
          <AbuseSignalItem key={signal.signal_id} signal={signal} />
        ))}
      </ul>
    </Panel>
  );
}
