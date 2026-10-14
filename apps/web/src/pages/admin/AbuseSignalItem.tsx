import { Button } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { useState } from 'react';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import { reviewAbuseSignal } from '../../features/admin/api';
import type { AbuseSignal } from '../../features/admin/queries';
import styles from '../../features/economy/economy.module.css';
import { formatDateTime, useLocale, useMessages } from '../../i18n';

import { abuseMessages } from './abuseMessages';

/** One signal and the admin's review note. */
export function AbuseSignalItem({ signal }: { signal: AbuseSignal }) {
  const copy = useMessages(abuseMessages);
  const { locale } = useLocale();
  const [note, setNote] = useState('');
  const review = useGameAction((_, text: string) => reviewAbuseSignal(signal.signal_id, text), {
    refreshes: [['me']],
  });
  const who = [signal.user_name, signal.other_name].filter(Boolean).join(' · ');

  return (
    <li>
      <span>
        <strong>{copy[`kind_${signal.kind}`]}</strong>
        {who ? ` · ${who}` : null}
        <br />
        <span className={styles.muted}>{formatDateTime(signal.created_at, locale)}</span>
        <ActionFeedback
          problem={review.problem}
          copy={copy}
          success={review.succeeded ? copy.reviewed : null}
        />
      </span>
      {review.succeeded ? null : (
        <form
          className={styles.inline}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            review.run(note);
          }}
        >
          <Field
            label={copy.note}
            autoComplete="off"
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
            }}
          />
          <Button type="submit" variant="secondary" disabled={review.pending}>
            {copy.review}
          </Button>
        </form>
      )}
    </li>
  );
}
