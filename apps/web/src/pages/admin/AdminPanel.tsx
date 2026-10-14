import { Note } from '@concordia/atlas/Note';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import { schedule } from '../../features/admin/api';
import type { Schedule } from '../../features/admin/api';
import { useAdminCountries, useAdminRegions } from '../../features/admin/queries';
import { useMessages } from '../../i18n';

import { AbuseSection } from './AbuseSection';
import { AdminLogSection } from './AdminLogSection';
import styles from './AdminPage.module.css';
import { AdminTeamSection } from './AdminTeamSection';
import { BetaSection } from './BetaSection';
import { CompensationSection } from './CompensationSection';
import { CountriesSection } from './CountriesSection';
import { EconomySection } from './EconomySection';
import { IndependenceSection } from './IndependenceSection';
import { messages } from './messages';
import { RegionsSection } from './RegionsSection';
import { ReportsSection } from './ReportsSection';

/** The admin's work: switching countries and regions for the next day, the log and the team. */
export function AdminPanel() {
  const copy = useMessages(messages);
  const countries = useAdminCountries(true);
  const regions = useAdminRegions(true);
  const scheduling = useGameAction((_, change: Schedule) => schedule(change));

  if (countries.isError || regions.isError) return <Note tone="error">{copy.loadFailed}</Note>;

  return (
    <>
      <div className={styles.notice}>
        <ActionFeedback
          problem={scheduling.problem}
          copy={copy}
          success={scheduling.succeeded ? copy.scheduled : null}
        />
      </div>
      <CountriesSection countries={countries.data ?? []} onSchedule={scheduling.run} />
      <RegionsSection
        countries={countries.data ?? []}
        regions={regions.data ?? []}
        onSchedule={scheduling.run}
      />
      <EconomySection />
      <ReportsSection />
      <AbuseSection />
      <BetaSection />
      <CompensationSection />
      <IndependenceSection />
      <AdminLogSection countries={countries.data ?? []} />
      <AdminTeamSection />
    </>
  );
}
