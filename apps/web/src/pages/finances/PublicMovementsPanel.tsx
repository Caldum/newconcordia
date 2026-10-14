import { Panel } from '@concordia/atlas/Panel';

import styles from '../../features/economy/economy.module.css';
import { movementKind } from '../../features/finance/movements';
import { usePublicMovements } from '../../features/finance/queries';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { formatDateTime, formatMoney, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';
import { useCounterpartyName } from './useCounterpartyName';

/** The public audit: every movement of institutional money, newest first. */
export function PublicMovementsPanel() {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const citizen = useCurrentCitizen();
  const movements = usePublicMovements(citizen.country_code);
  const counterparty = useCounterpartyName();
  const rows = movements.data ?? [];

  return (
    <Panel className={styles.panel} aria-labelledby="movements-title">
      <h2 id="movements-title" className="at-title-3">
        {copy.movementsTitle}
      </h2>
      {movements.isSuccess && rows.length === 0 ? (
        <p className={styles.muted}>{copy.noMovements}</p>
      ) : null}
      {rows.length > 0 ? (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">{copy.when}</th>
                <th scope="col">{copy.institution}</th>
                <th scope="col">{copy.concept}</th>
                <th scope="col" className={styles.number}>
                  {copy.amount}
                </th>
                <th scope="col">{copy.counterparty}</th>
                <th scope="col">{copy.orderedBy}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((movement) => (
                <tr key={`${String(movement.posting_id)}-${movement.institution}`}>
                  <td>{formatDateTime(movement.created_at, locale)}</td>
                  <td>{copy[`institution_${movement.institution}`]}</td>
                  <td>
                    {copy[`movement_${movementKind(movement.kind)}`]}
                    {movement.memo ? (
                      <>
                        <br />
                        <span className={styles.muted}>{movement.memo}</span>
                      </>
                    ) : null}
                  </td>
                  <td className={styles.number}>
                    {formatMoney(movement.amount, locale, { signed: true })}{' '}
                    {movement.currency_code === 'GOLD' ? copy.gold : copy.credit}
                  </td>
                  <td>{counterparty(movement)}</td>
                  <td>{movement.ordered_by ?? copy.system}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </Panel>
  );
}
