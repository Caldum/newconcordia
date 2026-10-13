import type { Movement } from '../../features/ledger/queries';
import { formatDateTime, formatMoney, useLocale } from '../../i18n';

import styles from './AccountPage.module.css';
import { useMovementText } from './useMovementText';

/** One line of the statement. */
export function MovementRow({ movement }: { movement: Movement }) {
  const { locale } = useLocale();
  const text = useMovementText();
  const unit = text.unit(movement.currency_code);
  return (
    <tr>
      <td>{formatDateTime(movement.created_at, locale)}</td>
      <td>{movement.memo ?? text.kind(movement.kind)}</td>
      <td>{text.counterparty(movement)}</td>
      <td className={styles.number}>
        {formatMoney(movement.amount, locale, { signed: true }) + unit}
      </td>
      <td className={styles.number}>{formatMoney(movement.balance_after, locale) + unit}</td>
    </tr>
  );
}
