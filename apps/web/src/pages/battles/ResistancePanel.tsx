import { Panel } from '@concordia/atlas/Panel';

import styles from '../../features/economy/economy.module.css';
import { useGoldPrice } from '../../features/prices/useGoldPrice';
import { useOccupiedRegions } from '../../features/war/queries';
import { useMessages } from '../../i18n';

import { messages } from './messages';
import { ResistanceItem } from './ResistanceItem';

/** Occupied regions and their resistance: ten organizers start a battle at once. */
export function ResistancePanel() {
  const copy = useMessages(messages);
  const occupied = useOccupiedRegions();
  const price = useGoldPrice('resistance_organizer');
  const rows = occupied.data ?? [];

  return (
    <Panel className={styles.panel} aria-labelledby="resistance-title">
      <h2 id="resistance-title" className="at-title-3">
        {copy.resistanceTitle}
      </h2>
      <p className={styles.muted}>{copy.resistanceHint(price)}</p>
      {occupied.isSuccess && rows.length === 0 ? (
        <p className={styles.muted}>{copy.noOccupied}</p>
      ) : null}
      <ul className={styles.recipes}>
        {rows.map((region) => (
          <ResistanceItem key={region.region_code} region={region} />
        ))}
      </ul>
    </Panel>
  );
}
