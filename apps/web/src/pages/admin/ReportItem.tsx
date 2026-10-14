import { Button } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { useState } from 'react';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { resolveReport } from '../../features/moderation/api';
import type { ModerationReport } from '../../features/moderation/queries';
import { formatDateTime, useLocale, useMessages } from '../../i18n';

import { moderationMessages } from './moderationMessages';

/** One report: what was reported, by whom and why, and hiding it or dismissing the report. */
export function ReportItem({ report }: { report: ModerationReport }) {
  const copy = useMessages(moderationMessages);
  const { locale } = useLocale();
  const [note, setNote] = useState('');
  const resolve = useGameAction((_, action: 'dismiss' | 'hide') =>
    resolveReport(report.report_id, action, note.trim()),
  );
  const canHide = report.target_kind !== 'citizen' && !report.target_hidden;
  return (
    <li>
      <span>
        <strong>
          {copy[`kind_${report.target_kind}`]} · {copy[`reason_${report.reason}`]}
        </strong>
        {report.target_author ? ` · ${copy.by(report.target_author)}` : null} ·{' '}
        {copy.count(report.reports_on_target)}
        {report.target_title ? (
          <>
            <br />
            <em>{report.target_title}</em>
          </>
        ) : null}
        {report.target_excerpt ? (
          <>
            <br />
            <span style={{ whiteSpace: 'pre-wrap' }}>{report.target_excerpt}</span>
          </>
        ) : null}
        {report.details ? (
          <>
            <br />
            <span className={styles.muted}>«{report.details}»</span>
          </>
        ) : null}
        <br />
        <span className={styles.muted}>
          {copy.reportedBy(report.reporter_name ?? '—', formatDateTime(report.created_at, locale))}
          {report.target_hidden ? ` · ${copy.hidden}` : null}
        </span>
        <ActionFeedback
          problem={resolve.problem}
          copy={copy}
          success={resolve.succeeded ? copy.resolved : null}
        />
      </span>
      {resolve.succeeded ? null : (
        <span className={styles.inline}>
          <Field
            label={copy.note}
            autoComplete="off"
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
            }}
          />
          {canHide ? (
            <Button
              variant="war"
              disabled={resolve.pending}
              onClick={() => {
                resolve.run('hide');
              }}
            >
              {copy.hide}
            </Button>
          ) : null}
          <Button
            variant="secondary"
            disabled={resolve.pending}
            onClick={() => {
              resolve.run('dismiss');
            }}
          >
            {copy.dismiss}
          </Button>
        </span>
      )}
    </li>
  );
}
