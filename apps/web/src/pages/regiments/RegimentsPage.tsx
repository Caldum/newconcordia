import { Note } from '@concordia/atlas/Note';

import styles from '../../features/economy/economy.module.css';
import { MilitaryTabs } from '../../features/military/MilitaryTabs';
import { useMyRegiment, useRegiments } from '../../features/regiments/queries';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { useCountryName } from '../../features/world/useNames';
import { useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import { FoundRegimentForm } from './FoundRegimentForm';
import { messages } from './messages';
import { MyRegimentPanel } from './MyRegimentPanel';
import { RegimentList } from './RegimentList';

/** `/regiments`: the player's regiment (or founding one) and the country's regiments. */
export function RegimentsPage() {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);
  const citizen = useCurrentCitizen();
  const countryName = useCountryName();
  const regiments = useRegiments(citizen.country_code);
  const mine = useMyRegiment();
  return (
    <main className={styles.page}>
      <MilitaryTabs />
      <div className={styles.intro}>
        <h1 className="at-title-1">{copy.title(countryName(citizen.country_code))}</h1>
        <p className="at-body-l">{copy.intro}</p>
      </div>
      {regiments.isError || mine.isError ? <Note tone="error">{copy.loadFailed}</Note> : null}
      {regiments.isSuccess && mine.isSuccess ? (
        <div className={styles.layout}>
          <div className={styles.column}>
            {mine.data ? <MyRegimentPanel regiment={mine.data} /> : <FoundRegimentForm />}
          </div>
          <RegimentList regiments={regiments.data} inRegiment={mine.data !== null} />
        </div>
      ) : null}
    </main>
  );
}
