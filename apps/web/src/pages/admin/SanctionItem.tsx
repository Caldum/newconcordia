import { Button } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { Status } from '@concordia/atlas/Status';
import { useState } from 'react';

import { useGameAction } from '../../features/actions/useGameAction';
import { revokeSanction } from '../../features/admin/api';
import { ConsoleFeedback } from '../../features/admin/ConsoleFeedback';
import type { CitizenRecord } from '../../features/admin/queries';
import { formatDateTime, useLocale, useMessages } from '../../i18n';

import styles from './AdminPage.module.css';
import { citizenMessages } from './citizenMessages';

type RecordSanction = CitizenRecord['sanctions'][number];

/** One sanction: what, why, from when until when, who set it, and lifting it while in force. */
export function SanctionItem({ sanction }: { sanction: RecordSanction }) {
  const copy = useMessages(citizenMessages);
  const { locale } = useLocale();
  const [note, setNote] = useState('');
  const lift = useGameAction(() => revokeSanction(sanction.sanction_id, note.trim()));
  const kind = copy[`kind_${sanction.kind}`];
  const span =
    sanction.kind === 'warning'
      ? copy.since(formatDateTime(sanction.starts_at, locale))
      : `${copy.since(formatDateTime(sanction.starts_at, locale))} ${
          sanction.ends_at ? copy.until(formatDateTime(sanction.ends_at, locale)) : copy.forever
        }`;
  return (
    <li>
      <div className={styles.row}>
        <span>
          <strong>{copy.sanctionLine(kind, copy[`reason_${sanction.reason}`])}</strong>{' '}
          {sanction.kind === 'warning' ? null : (
            <Status tone={sanction.active ? 'warning' : 'neutral'}>
              {sanction.active ? copy.inForce : copy.ended}
            </Status>
          )}
          <br />
          <span className={styles.meta}>
            {span} · {copy.setBy(sanction.created_by ?? '—')}
          </span>
          {sanction.note ? (
            <>
              <br />«{sanction.note}»
            </>
          ) : null}
          {sanction.revoked_at ? (
            <>
              <br />
              <span className={styles.meta}>
                {copy.revokedAt(formatDateTime(sanction.revoked_at, locale))}
                {sanction.revoke_note ? ` · «${sanction.revoke_note}»` : null}
              </span>
            </>
          ) : null}
        </span>
      </div>
      {sanction.active && !lift.succeeded ? (
        <form
          className={styles.row}
          noValidate
          aria-label={copy.liftOf(kind)}
          onSubmit={(event) => {
            event.preventDefault();
            lift.run();
          }}
        >
          <Field
            label={copy.liftNote}
            autoComplete="off"
            maxLength={300}
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
              lift.changed();
            }}
          />
          <Button type="submit" variant="secondary" disabled={lift.pending}>
            {copy.lift}
          </Button>
        </form>
      ) : null}
      <ConsoleFeedback
        problem={lift.problem}
        copy={copy}
        success={lift.succeeded ? copy.lifted : null}
      />
    </li>
  );
}
