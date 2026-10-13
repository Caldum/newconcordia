import { Note } from '@concordia/atlas/Note';

import styles from '../../features/economy/economy.module.css';
import { EconomyTabs } from '../../features/economy/EconomyTabs';
import { useMyCompanies, useMyJob, useMyShiftsToday } from '../../features/economy/queries';
import { useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import { HowProductionWorks } from './HowProductionWorks';
import { JobCard } from './JobCard';
import { JobOffers } from './JobOffers';
import { messages } from './messages';
import { NoJob } from './NoJob';
import { OwnCompaniesWork } from './OwnCompaniesWork';
import { Payslip } from './Payslip';
import { SecondShift } from './SecondShift';

/** `/work` (Work canvas): the job, today's shifts and the offers of the player's country. */
export function WorkPage() {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);
  const job = useMyJob();
  const shifts = useMyShiftsToday();
  const companies = useMyCompanies();
  const today = shifts.data ?? [];
  const regular = today.find((shift) => shift.kind === 'regular') ?? null;
  const second = today.find((shift) => shift.kind === 'second') ?? null;
  const managed = new Set(
    today.filter((shift) => shift.kind === 'management').map((shift) => shift.company_id),
  );
  const toManage = (companies.data ?? []).filter((company) => !managed.has(company.id));
  const secondShiftWage = job.data?.second_shift_wage ?? null;

  return (
    <main className={styles.page}>
      <EconomyTabs />
      <div className={styles.intro}>
        <h1 className="at-title-1">{copy.title}</h1>
        <p className="at-body-l">{copy.intro}</p>
      </div>
      {job.isError || shifts.isError ? <Note tone="error">{copy.loadFailed}</Note> : null}
      {job.isSuccess && shifts.isSuccess ? (
        <div className={styles.layout}>
          <div className={styles.column}>
            {job.data ? <JobCard job={job.data} /> : <NoJob />}
            <JobOffers hasJob={job.data !== null} />
          </div>
          <div className={styles.column}>
            {job.data || regular ? <Payslip job={job.data} shift={regular} /> : null}
            {secondShiftWage !== null && regular ? (
              <SecondShift wage={secondShiftWage} shift={second} />
            ) : null}
            {toManage.length > 0 ? <OwnCompaniesWork companies={toManage} /> : null}
            <HowProductionWorks />
          </div>
        </div>
      ) : null}
    </main>
  );
}
