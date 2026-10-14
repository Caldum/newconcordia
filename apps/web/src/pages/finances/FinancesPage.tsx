import styles from '../../features/economy/economy.module.css';
import { ministryOf } from '../../features/finance/ministry';
import { PoliticsTabs } from '../../features/politics/PoliticsTabs';
import { useMyOffice } from '../../features/politics/queries';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { useCountryName } from '../../features/world/useNames';
import { useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import { messages } from './messages';
import { MinistryPanel } from './MinistryPanel';
import { MinistryStock } from './MinistryStock';
import { PublicFundsPanel } from './PublicFundsPanel';
import { PublicMovementsPanel } from './PublicMovementsPanel';

/** `/finances`: the public funds and movements of the State, and the minister's own ministry. */
export function FinancesPage() {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);
  const citizen = useCurrentCitizen();
  const countryName = useCountryName();
  const office = useMyOffice().data?.office ?? null;
  const ministry = ministryOf(office);

  return (
    <main className={styles.page}>
      <PoliticsTabs />
      <div className={styles.intro}>
        <h1 className="at-title-1">{copy.title(countryName(citizen.country_code))}</h1>
        <p className="at-body-l">{copy.intro}</p>
      </div>
      <div className={styles.layout}>
        <div className={styles.column}>
          <PublicFundsPanel />
          <PublicMovementsPanel />
        </div>
        <div className={styles.column}>
          {ministry ? <MinistryPanel ministry={ministry} /> : null}
          {office === 'president' ? <MinistryStock ministry="health" /> : null}
        </div>
      </div>
    </main>
  );
}
