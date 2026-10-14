import { Note } from '@concordia/atlas/Note';

import styles from '../../features/economy/economy.module.css';
import { PoliticsTabs } from '../../features/politics/PoliticsTabs';
import { useMyParty, useNationalElection } from '../../features/politics/queries';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { useCountryName } from '../../features/world/useNames';
import { useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import { CongressElection } from './CongressElection';
import { GovernmentPanel } from './GovernmentPanel';
import { messages } from './messages';
import { PresidentialElection } from './PresidentialElection';

/** `/elections`: who governs, and the month's presidential and congressional elections. */
export function ElectionsPage() {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);
  const citizen = useCurrentCitizen();
  const countryName = useCountryName();
  const presidential = useNationalElection(citizen.country_code, 'president');
  const congress = useNationalElection(citizen.country_code, 'congress');
  const myParty = useMyParty();
  // The leader of a party registers its ticket and its list.
  const leaderOf = myParty.data?.is_leader ? myParty.data.party_id : null;

  return (
    <main className={styles.page}>
      <PoliticsTabs />
      <div className={styles.intro}>
        <h1 className="at-title-1">{copy.title(countryName(citizen.country_code))}</h1>
        <p className="at-body-l">{copy.intro}</p>
      </div>
      {presidential.isError || congress.isError ? (
        <Note tone="error">{copy.loadFailed}</Note>
      ) : null}
      <div className={styles.layout}>
        <div className={styles.column}>
          {presidential.data ? (
            <PresidentialElection election={presidential.data} leaderOf={leaderOf} />
          ) : null}
          {congress.data ? <CongressElection election={congress.data} leaderOf={leaderOf} /> : null}
        </div>
        <GovernmentPanel />
      </div>
    </main>
  );
}
