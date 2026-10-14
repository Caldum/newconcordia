import { Button } from '@concordia/atlas/Button';
import { useId, useState } from 'react';

import { useMessages } from '../../i18n';
import { ActionFeedback } from '../actions/ActionFeedback';
import { useGameAction } from '../actions/useGameAction';

import { reportContent } from './api';
import type { NewReport, ReportKind, ReportReason } from './api';
import { reportMessages } from './messages';
import styles from './ReportButton.module.css';

const reasons: readonly ReportReason[] = ['spam', 'abuse', 'hate', 'cheating', 'other'];

interface ReportButtonProps {
  kind: ReportKind;
  target: string;
  /** What is reported, for the button's accessible name: «el artículo «Abre el mercado»». */
  what: string;
}

/** Reporting something to moderation: a reason and optional details, sent once. */
export function ReportButton({ kind, target, what }: ReportButtonProps) {
  const copy = useMessages(reportMessages);
  const reasonId = useId();
  const detailsId = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('spam');
  const [details, setDetails] = useState('');
  const send = useGameAction((_, report: NewReport) => reportContent(report));

  if (send.succeeded) {
    return (
      <div role="status" className={styles.sent}>
        {copy.sent}
      </div>
    );
  }
  if (!open) {
    return (
      <Button
        variant="ghost"
        aria-label={copy.reportAria(what)}
        onClick={() => {
          setOpen(true);
        }}
      >
        {copy.report}
      </Button>
    );
  }
  return (
    <form
      className={styles.form}
      aria-label={copy.formTitle}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        send.run({ kind, target, reason, details: details.trim() });
      }}
    >
      <label htmlFor={reasonId} className={styles.label}>
        {copy.reason}
      </label>
      <select
        id={reasonId}
        className={styles.select}
        value={reason}
        onChange={(event) => {
          setReason(event.target.value as ReportReason);
          send.changed();
        }}
      >
        {reasons.map((value) => (
          <option key={value} value={value}>
            {copy[`reason_${value}`]}
          </option>
        ))}
      </select>
      <label htmlFor={detailsId} className={styles.label}>
        {copy.details}
      </label>
      <textarea
        id={detailsId}
        className={styles.textarea}
        rows={3}
        maxLength={500}
        value={details}
        onChange={(event) => {
          setDetails(event.target.value);
          send.changed();
        }}
      />
      <ActionFeedback problem={send.problem} copy={copy} />
      <div className={styles.buttons}>
        <Button type="submit" variant="war" disabled={send.pending}>
          {copy.send}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setOpen(false);
          }}
        >
          {copy.cancel}
        </Button>
      </div>
    </form>
  );
}
