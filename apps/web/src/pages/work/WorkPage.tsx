import { Note } from '@concordia/atlas/Note';

import styles from '../../features/economy/economy.module.css';
import { EconomyTabs } from '../../features/economy/EconomyTabs';
import { useMyCompanies, useMyJob, useMyWorkday } from '../../features/economy/queries';
import { useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import { HowProductionWorks } from './HowProductionWorks';
import { JobCard } from './JobCard';
import { JobOffers } from './JobOffers';
import { messages } from './messages';
import { NoJob } from './NoJob';
import { OwnCompaniesWork } from './OwnCompaniesWork';
import { Payslip } from './Payslip';

/** `/work` (Work canvas): the job, today's workday and the offers of the player's country. */
export function WorkPage() {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);
  const job = useMyJob();
  const workday = useMyWorkday();
  const companies = useMyCompanies();
  const ownCompanies = companies.data ?? [];

  return (
    <main className={styles.page}>
      <EconomyTabs />
      <div className={styles.intro}>
        <h1 className="at-title-1">{copy.title}</h1>
        <p className="at-body-l">{copy.intro}</p>
      </div>
      {job.isError || workday.isError ? <Note tone="error">{copy.loadFailed}</Note> : null}
      {job.isSuccess && workday.isSuccess ? (
        <div className={styles.layout}>
          <div className={styles.column}>
            {job.data ? <JobCard job={job.data} /> : <NoJob />}
            <JobOffers hasJob={job.data !== null} />
          </div>
          <div className={styles.column}>
            {job.data || workday.data ? <Payslip job={job.data} workday={workday.data} /> : null}
            {!workday.data && ownCompanies.length > 0 ? (
              <OwnCompaniesWork companies={ownCompanies} />
            ) : null}
            <HowProductionWorks />
          </div>
        </div>
      ) : null}
    </main>
  );
}
