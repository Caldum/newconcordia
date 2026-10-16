import { Note } from '@concordia/atlas/Note';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import { AdminOnly } from '../../features/admin/AdminOnly';
import { schedule } from '../../features/admin/api';
import type { Schedule } from '../../features/admin/api';
import { useCurrentStaff } from '../../features/admin/CurrentStaff';
import { useAdminCountries, useAdminRegions } from '../../features/admin/queries';
import { useMessages } from '../../i18n';

import styles from './AdminPage.module.css';
import { ConsolePage } from './ConsolePage';
import { CountriesSection } from './CountriesSection';
import { IndependenceSection } from './IndependenceSection';
import { messages } from './messages';
import { RegionsSection } from './RegionsSection';

/** `/admin/world`: countries and regions switched at the next day change, and the independence war. */
export function WorldPage() {
  const copy = useMessages(messages);
  const admin = useCurrentStaff().role === 'admin';
  const countries = useAdminCountries(admin);
  const regions = useAdminRegions(admin);
  const scheduling = useGameAction((_, change: Schedule) => schedule(change));

  return (
    <ConsolePage title={copy.title} intro={copy.appliesAt}>
      <AdminOnly>
        {countries.isError || regions.isError ? (
          <Note tone="error">{copy.loadFailed}</Note>
        ) : (
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
            <IndependenceSection />
          </>
        )}
      </AdminOnly>
    </ConsolePage>
  );
}
