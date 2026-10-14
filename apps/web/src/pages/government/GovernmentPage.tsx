import { Note } from '@concordia/atlas/Note';

import styles from '../../features/economy/economy.module.css';
import { PoliticsTabs } from '../../features/politics/PoliticsTabs';
import { useCabinet, useMyOffice } from '../../features/politics/queries';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { useCountryName } from '../../features/world/useNames';
import { useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import { AppointForm } from './AppointForm';
import { CabinetPanel } from './CabinetPanel';
import { messages } from './messages';
import { MotionsPanel } from './MotionsPanel';
import { MyOfficePanel } from './MyOfficePanel';

/** `/government`: the cabinet, the president's appointments, the player's office and Congress's motions. */
export function GovernmentPage() {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);
  const citizen = useCurrentCitizen();
  const countryName = useCountryName();
  const cabinet = useCabinet(citizen.country_code);
  const myOffice = useMyOffice();
  const office = myOffice.data?.office ?? null;

  return (
    <main className={styles.page}>
      <PoliticsTabs />
      <div className={styles.intro}>
        <h1 className="at-title-1">{copy.title(countryName(citizen.country_code))}</h1>
        <p className="at-body-l">{copy.intro}</p>
      </div>
      {cabinet.isError ? <Note tone="error">{copy.loadFailed}</Note> : null}
      <div className={styles.layout}>
        <div className={styles.column}>
          <CabinetPanel seats={cabinet.data ?? []} isPresident={office === 'president'} />
          {office === 'president' ? <AppointForm /> : null}
        </div>
        <div className={styles.column}>
          {office ? <MyOfficePanel office={office} /> : null}
          <MotionsPanel inCongress={office === 'congress'} />
        </div>
      </div>
    </main>
  );
}
