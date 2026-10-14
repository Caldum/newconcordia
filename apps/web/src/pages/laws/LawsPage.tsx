import { Note } from '@concordia/atlas/Note';
import { Panel } from '@concordia/atlas/Panel';

import styles from '../../features/economy/economy.module.css';
import { PoliticsTabs } from '../../features/politics/PoliticsTabs';
import { useMyInitiative, useMyOffice } from '../../features/politics/queries';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { useCountryName } from '../../features/world/useNames';
import { useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import { BillsPanel } from './BillsPanel';
import { DecreesPanel } from './DecreesPanel';
import { messages } from './messages';
import { ProposeBillForm } from './ProposeBillForm';

/** `/laws`: bills under vote and their outcome, presenting bills, the vice president's tie-breaks, decrees. */
export function LawsPage() {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);
  const citizen = useCurrentCitizen();
  const countryName = useCountryName();
  const office = useMyOffice().data?.office ?? null;
  const initiative = useMyInitiative().data ?? null;

  return (
    <main className={styles.page}>
      <PoliticsTabs />
      <div className={styles.intro}>
        <h1 className="at-title-1">{copy.title(countryName(citizen.country_code))}</h1>
        <p className="at-body-l">{copy.intro}</p>
      </div>
      <div className={styles.layout}>
        <div className={styles.column}>
          <BillsPanel
            inCongress={office === 'congress'}
            isVicePresident={office === 'vice_president'}
          />
        </div>
        <div className={styles.column}>
          {initiative && initiative.allowed !== 0 ? (
            <ProposeBillForm initiative={initiative} />
          ) : null}
          {office === 'vice_president' ? (
            <Panel className={styles.panel}>
              <Note tone="info">{copy.viceHint}</Note>
            </Panel>
          ) : null}
          <DecreesPanel isPresident={office === 'president'} />
        </div>
      </div>
    </main>
  );
}
