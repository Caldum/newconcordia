import { Panel } from '@concordia/atlas/Panel';

import { fillPulse } from '../../features/war/live';
import { useIndependencePulse } from '../../features/war/queries';
import { formatNumber, useLocale, useMessages } from '../../i18n';
import { useTick } from '../../lib/useTick';

import styles from './IndependenceWar.module.css';
import { messages } from './messages';

/** Damage minute by minute over the last half hour: a bar per minute, the current one in red. */
export function PulsePanel({ warId }: { warId: number }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const now = useTick(10_000);
  const pulse = fillPulse(useIndependencePulse(warId).data ?? [], now);
  const peak = Math.max(1, ...pulse.map((minute) => minute.damage));
  const last = pulse[pulse.length - 1];
  const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' });

  return (
    <Panel aria-labelledby="pulse-title" className={styles.fighter}>
      <h2 id="pulse-title" className="at-title-3">
        {copy.pulseTitle}
      </h2>
      <p className={styles.when}>{copy.pulseHint}</p>
      <ol className={styles.pulse} aria-label={copy.pulseHint}>
        {pulse.map((minute) => (
          <li
            key={minute.minute}
            aria-label={copy.pulseBar(
              time.format(new Date(minute.minute)),
              formatNumber(minute.damage, locale),
            )}
          >
            <span style={{ height: `${String(Math.round((minute.damage / peak) * 100))}%` }} />
          </li>
        ))}
      </ol>
      {last ? (
        <p>{copy.pulseSummary(formatNumber(last.damage, locale), last.strikes, last.fighters)}</p>
      ) : null}
    </Panel>
  );
}
