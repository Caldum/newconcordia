import { Button } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { Panel } from '@concordia/atlas/Panel';
import { Segmented } from '@concordia/atlas/Segmented';
import { useId, useState } from 'react';

import { useGameAction } from '../../features/actions/useGameAction';
import { sanction } from '../../features/admin/api';
import type { NewSanction } from '../../features/admin/api';
import { ConsoleFeedback } from '../../features/admin/ConsoleFeedback';
import { useCurrentStaff } from '../../features/admin/CurrentStaff';
import type { SanctionKind, SanctionReason } from '../../features/admin/queries';
import economy from '../../features/economy/economy.module.css';
import { useMessages } from '../../i18n';

import styles from './AdminPage.module.css';
import { citizenMessages } from './citizenMessages';

const kinds: readonly SanctionKind[] = ['warning', 'mute', 'suspension'];
const reasons: readonly SanctionReason[] = [
  'spam',
  'abuse',
  'hate',
  'cheating',
  'multi_account',
  'name',
  'other',
];
/** Moderators choose up to 30 days; longer and for good are for admins (the database checks it). */
const durations = ['1', '24', '72', '168', '720', '2160', 'forever'] as const;
type Duration = (typeof durations)[number];
const moderatorDurations: readonly Duration[] = ['1', '24', '72', '168', '720'];

/** Warning, muting or suspending a citizen, with the reason, how long, and the note the player reads. */
export function SanctionForm({ name }: { name: string }) {
  const copy = useMessages(citizenMessages);
  const staff = useCurrentStaff();
  const reasonId = useId();
  const durationId = useId();
  const [kind, setKind] = useState<SanctionKind>('warning');
  const [reason, setReason] = useState<SanctionReason>('abuse');
  const [duration, setDuration] = useState<Duration>('24');
  const [note, setNote] = useState('');
  const apply = useGameAction((_, request: NewSanction) => sanction(request), {
    onSuccess: () => {
      setNote('');
    },
  });
  const offered = staff.role === 'admin' ? durations : moderatorDurations;

  return (
    <Panel className={styles.section} aria-labelledby="sanction-title">
      <div>
        <h2 id="sanction-title" className="at-title-3">
          {copy.sanctionTitle}
        </h2>
        <p>{copy.sanctionIntro}</p>
      </div>
      <form
        className={economy.form}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          apply.run({
            name,
            kind,
            reason,
            note: note.trim(),
            hours: kind === 'warning' || duration === 'forever' ? null : Number(duration),
          });
        }}
      >
        <Segmented
          label={copy.kind}
          segments={kinds.map((value) => ({ value, label: copy[`kind_${value}`] }))}
          value={kind}
          onChange={(value) => {
            setKind(value);
            apply.changed();
          }}
        />
        <div className={styles.row}>
          <div className={economy.field}>
            <label htmlFor={reasonId} className={economy.label}>
              {copy.reason}
            </label>
            <select
              id={reasonId}
              className={economy.select}
              value={reason}
              onChange={(event) => {
                setReason(event.target.value as SanctionReason);
                apply.changed();
              }}
            >
              {reasons.map((value) => (
                <option key={value} value={value}>
                  {copy[`reason_${value}`]}
                </option>
              ))}
            </select>
          </div>
          {kind === 'warning' ? null : (
            <div className={economy.field}>
              <label htmlFor={durationId} className={economy.label}>
                {copy.duration}
              </label>
              <select
                id={durationId}
                className={economy.select}
                value={duration}
                onChange={(event) => {
                  setDuration(event.target.value as Duration);
                  apply.changed();
                }}
              >
                {offered.map((value) => (
                  <option key={value} value={value}>
                    {copy[`hours_${value}`]}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <Field
          label={copy.playerNote}
          autoComplete="off"
          maxLength={500}
          value={note}
          onChange={(event) => {
            setNote(event.target.value);
            apply.changed();
          }}
        />
        <div>
          <Button
            type="submit"
            variant={kind === 'warning' ? 'secondary' : 'war'}
            disabled={apply.pending}
          >
            {copy.apply}
          </Button>
        </div>
      </form>
      <ConsoleFeedback
        problem={apply.problem}
        copy={copy}
        success={apply.succeeded ? copy.applied : null}
      />
    </Panel>
  );
}
