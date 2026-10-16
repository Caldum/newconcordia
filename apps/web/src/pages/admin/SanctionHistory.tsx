import { Panel } from '@concordia/atlas/Panel';

import type { CitizenRecord } from '../../features/admin/queries';
import { useMessages } from '../../i18n';

import styles from './AdminPage.module.css';
import { citizenMessages } from './citizenMessages';
import { SanctionItem } from './SanctionItem';

/** Every sanction of a citizen, latest first; the ones in force can be lifted. */
export function SanctionHistory({ sanctions }: { sanctions: CitizenRecord['sanctions'] }) {
  const copy = useMessages(citizenMessages);
  return (
    <Panel className={styles.section} aria-labelledby="sanction-history">
      <h2 id="sanction-history" className="at-title-3">
        {copy.historyTitle}
      </h2>
      {sanctions.length === 0 ? <p>{copy.noSanctions}</p> : null}
      <ul className={styles.list}>
        {sanctions.map((item) => (
          <SanctionItem key={item.sanction_id} sanction={item} />
        ))}
      </ul>
    </Panel>
  );
}
