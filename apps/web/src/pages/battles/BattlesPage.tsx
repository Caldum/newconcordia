import styles from '../../features/economy/economy.module.css';
import { MilitaryTabs } from '../../features/military/MilitaryTabs';
import { useMyOffice } from '../../features/politics/queries';
import { useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import { BattleList } from './BattleList';
import { LaunchPanel } from './LaunchPanel';
import { messages } from './messages';
import { ResistancePanel } from './ResistancePanel';
import { WarAuthorizationsPanel } from './WarAuthorizationsPanel';

/** `/battles`: ongoing and recent battles, the president's launches and the war authorizations. */
export function BattlesPage() {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);
  const isPresident = useMyOffice().data?.office === 'president';

  return (
    <main className={styles.page}>
      <MilitaryTabs />
      <div className={styles.intro}>
        <h1 className="at-title-1">{copy.title}</h1>
        <p className="at-body-l">{copy.intro}</p>
      </div>
      <div className={styles.layout}>
        <div className={styles.column}>
          <BattleList />
        </div>
        <div className={styles.column}>
          {isPresident ? <LaunchPanel /> : null}
          <WarAuthorizationsPanel canCancel={isPresident} />
          <ResistancePanel />
        </div>
      </div>
    </main>
  );
}
