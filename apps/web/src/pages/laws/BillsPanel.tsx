import { Note } from '@concordia/atlas/Note';
import { Panel } from '@concordia/atlas/Panel';

import styles from '../../features/economy/economy.module.css';
import { useBills } from '../../features/politics/queries';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { useMessages } from '../../i18n';

import { BillItem } from './BillItem';
import { messages } from './messages';

interface BillsPanelProps {
  inCongress: boolean;
  isVicePresident: boolean;
}

/** Bills under vote first, then the latest outcomes. */
export function BillsPanel({ inCongress, isVicePresident }: BillsPanelProps) {
  const copy = useMessages(messages);
  const citizen = useCurrentCitizen();
  const bills = useBills(citizen.country_code);
  const rows = bills.data ?? [];

  return (
    <Panel className={styles.panel} aria-labelledby="bills-title">
      <h2 id="bills-title" className="at-title-3">
        {copy.billsTitle}
      </h2>
      {bills.isError ? <Note tone="error">{copy.loadFailed}</Note> : null}
      {bills.isSuccess && rows.length === 0 ? <p className={styles.muted}>{copy.noBills}</p> : null}
      <ul className={styles.recipes}>
        {rows.map((bill) => (
          <BillItem
            key={bill.bill_id}
            bill={bill}
            canVote={inCongress}
            canBreakTie={isVicePresident}
          />
        ))}
      </ul>
    </Panel>
  );
}
