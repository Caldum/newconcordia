import { Panel } from '@concordia/atlas/Panel';

import type { CitizenRecord } from '../../features/admin/queries';
import { formatDateTime, useLocale, useMessages } from '../../i18n';

import styles from './AdminPage.module.css';
import { citizenMessages } from './citizenMessages';
import { moderationMessages } from './moderationMessages';

/** Reports about the citizen or what they published, and how many they filed themselves. */
export function CitizenReports({ record }: { record: CitizenRecord }) {
  const copy = useMessages(citizenMessages);
  const reasons = useMessages(moderationMessages);
  const { locale } = useLocale();
  const reasonText = (reason: string) => {
    const text = (reasons as Record<string, unknown>)[`reason_${reason}`];
    return typeof text === 'string' ? text : reason;
  };
  return (
    <Panel className={styles.section} aria-labelledby="citizen-reports">
      <h2 id="citizen-reports" className="at-title-3">
        {copy.reportsTitle}
      </h2>
      <p>{copy.reportsFiled(record.reports_filed)}</p>
      {record.reports.length === 0 ? <p>{copy.noReports}</p> : null}
      <ul className={styles.list}>
        {record.reports.map((report) => (
          <li key={report.report_id}>
            <span>
              {copy.reportLine(
                copy[`kind_${report.target_kind}`],
                reasonText(report.reason),
                copy[`status_${report.status}`],
              )}
            </span>
            <span className={styles.meta}>
              {formatDateTime(report.created_at, locale)}
              {report.details ? ` · «${report.details}»` : null}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
