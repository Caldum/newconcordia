import styles from '../../features/economy/economy.module.css';
import { MilitaryTabs } from '../../features/military/MilitaryTabs';
import { useMyOffice } from '../../features/politics/queries';
import { useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import { HealthMinistryPanel } from './HealthMinistryPanel';
import { HospitalsPanel } from './HospitalsPanel';
import { HospitalStockPanel } from './HospitalStockPanel';
import { messages } from './messages';
import { MyHospitalPanel } from './MyHospitalPanel';

/** `/hospital`: treatment where the player is, the country's hospitals, and Health's management. */
export function HospitalPage() {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);
  const office = useMyOffice().data?.office ?? null;
  const isHealthMinister = office === 'minister_health';

  return (
    <main className={styles.page}>
      <MilitaryTabs />
      <div className={styles.intro}>
        <h1 className="at-title-1">{copy.title}</h1>
        <p className="at-body-l">{copy.intro}</p>
      </div>
      <div className={styles.layout}>
        <div className={styles.column}>
          <MyHospitalPanel />
          <HospitalsPanel canUpgrade={isHealthMinister} />
        </div>
        <div className={styles.column}>
          {isHealthMinister ? <HealthMinistryPanel /> : null}
          {isHealthMinister || office === 'president' ? <HospitalStockPanel /> : null}
        </div>
      </div>
    </main>
  );
}
