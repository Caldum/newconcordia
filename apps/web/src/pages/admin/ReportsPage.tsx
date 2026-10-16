import { Panel } from '@concordia/atlas/Panel';
import { Segmented } from '@concordia/atlas/Segmented';
import { useState } from 'react';

import styles from '../../features/economy/economy.module.css';
import { useReports } from '../../features/moderation/queries';
import type { ReportStatus } from '../../features/moderation/queries';
import { useMessages } from '../../i18n';

import { ConsolePage } from './ConsolePage';
import { moderationMessages } from './moderationMessages';
import { ReportItem } from './ReportItem';

const statuses: readonly ReportStatus[] = ['open', 'actioned', 'dismissed'];

/** `/admin/reports`: open reports oldest first with the moderator's decision; closed ones for the record. */
export function ReportsPage() {
  const copy = useMessages(moderationMessages);
  const [status, setStatus] = useState<ReportStatus>('open');
  const reports = useReports(status);
  const rows = reports.data ?? [];
  return (
    <ConsolePage
      title={copy.reportsTitle}
      intro={copy.reportsHint}
      aside={
        <Segmented
          label={copy.statusLabel}
          segments={statuses.map((value) => ({ value, label: copy[`status_${value}`] }))}
          value={status}
          onChange={setStatus}
        />
      }
    >
      <Panel className={styles.panel} aria-label={copy[`status_${status}`]}>
        {reports.isSuccess && rows.length === 0 ? (
          <p className={styles.muted}>{status === 'open' ? copy.none : copy.noneClosed}</p>
        ) : null}
        <ul className={styles.recipes}>
          {rows.map((report) => (
            <ReportItem key={report.report_id} report={report} />
          ))}
        </ul>
      </Panel>
    </ConsolePage>
  );
}
