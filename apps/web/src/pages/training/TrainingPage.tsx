import { Note } from '@concordia/atlas/Note';

import styles from '../../features/economy/economy.module.css';
import { MilitaryTabs } from '../../features/military/MilitaryTabs';
import { useMyTraining } from '../../features/training/queries';
import { useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import { InjuriesPanel } from './InjuriesPanel';
import { messages } from './messages';
import { TrainingCenterPanel } from './TrainingCenterPanel';

/** `/training`: the player's three centers, today's sessions, upgrades and injuries. */
export function TrainingPage() {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);
  const training = useMyTraining();

  return (
    <main className={styles.page}>
      <MilitaryTabs />
      <div className={styles.intro}>
        <h1 className="at-title-1">{copy.title}</h1>
        <p className="at-body-l">{copy.intro}</p>
      </div>
      {training.isError ? <Note tone="error">{copy.loadFailed}</Note> : null}
      <div className={styles.layout}>
        <div className={styles.column}>
          {(training.data ?? []).map((center) => (
            <TrainingCenterPanel key={center.kind} center={center} />
          ))}
        </div>
        <div className={styles.column}>
          <InjuriesPanel />
        </div>
      </div>
    </main>
  );
}
