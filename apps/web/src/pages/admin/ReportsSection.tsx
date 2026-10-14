import { Panel } from '@concordia/atlas/Panel';

import styles from '../../features/economy/economy.module.css';
import { useOpenReports } from '../../features/moderation/queries';
import { useMessages } from '../../i18n';

import { moderationMessages } from './moderationMessages';
import { ReportItem } from './ReportItem';

/** Open reports, oldest first, with what was reported and the moderator's decision. */
export function ReportsSection() {
  const copy = useMessages(moderationMessages);
  const reports = useOpenReports(true);
  const rows = reports.data ?? [];
  return (
    <Panel className={styles.panel} aria-labelledby="reports-title">
      <h2 id="reports-title" className="at-title-3">
        {copy.reportsTitle}
      </h2>
      <p className={styles.muted}>{copy.reportsHint}</p>
      {reports.isSuccess && rows.length === 0 ? <p className={styles.muted}>{copy.none}</p> : null}
      <ul className={styles.recipes}>
        {rows.map((report) => (
          <ReportItem key={report.report_id} report={report} />
        ))}
      </ul>
    </Panel>
  );
}
