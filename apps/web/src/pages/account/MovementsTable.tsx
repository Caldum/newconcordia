import type { Movement } from '../../features/ledger/queries';
import { useMessages } from '../../i18n';

import styles from './AccountPage.module.css';
import { messages } from './messages';
import { MovementRow } from './MovementRow';

/** When, what, with whom, how much, and the balance after each movement. */
export function MovementsTable({ movements }: { movements: readonly Movement[] }) {
  const copy = useMessages(messages);
  return (
    <div className={styles.tableScroll}>
      <table className={styles.table} aria-labelledby="movements-title">
        <thead>
          <tr>
            <th scope="col">{copy.when}</th>
            <th scope="col">{copy.concept}</th>
            <th scope="col">{copy.counterparty}</th>
            <th scope="col" className={styles.number}>
              {copy.amountColumn}
            </th>
            <th scope="col" className={styles.number}>
              {copy.balanceColumn}
            </th>
          </tr>
        </thead>
        <tbody>
          {movements.map((movement) => (
            <MovementRow key={movement.posting_id} movement={movement} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
