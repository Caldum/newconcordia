import { Switch } from '@concordia/atlas/Segmented';

import { formatDate, useLocale, useMessages } from '../../i18n';

import styles from './AdminPage.module.css';
import { dayToDate } from './describeState';
import { messages } from './messages';

interface ScheduledSwitchProps {
  label: string;
  /** The state now. */
  current: boolean;
  /** The state scheduled for the next day change, if any, and that day. */
  scheduled: boolean | null;
  applyOn: string | null;
  onChange: (next: boolean) => void;
}

/** A switch that schedules a change for the next game day, saying what is already scheduled. */
export function ScheduledSwitch({
  label,
  current,
  scheduled,
  applyOn,
  onChange,
}: ScheduledSwitchProps) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const pending =
    scheduled === null || applyOn === null
      ? null
      : copy.scheduledOn(
          scheduled ? copy.turnsOn : copy.turnsOff,
          formatDate(dayToDate(applyOn), locale),
        );
  return (
    <div className={styles.switchCell}>
      <Switch label={label} checked={scheduled ?? current} onChange={onChange} />
      {pending ? <span className={styles.pending}>{pending}</span> : null}
    </div>
  );
}
