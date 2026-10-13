import { Panel } from '@concordia/atlas/Panel';

import styles from '../../features/economy/economy.module.css';
import { useGoodName } from '../../features/economy/goods';
import { useBuyOrders } from '../../features/market/queries';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { formatMoney, useLocale, useMessages } from '../../i18n';

import { ordersMessages } from './ordersMessages';

/** The open buy orders of one good in the player's market, highest price first. */
export function BuyOrderBook({ good }: { good: string }) {
  const copy = useMessages(ordersMessages);
  const { locale } = useLocale();
  const goodName = useGoodName();
  const citizen = useCurrentCitizen();
  const orders = useBuyOrders(citizen.country_code, good);
  const rows = orders.data ?? [];

  return (
    <Panel className={styles.panel} aria-labelledby="book-title">
      <h2 id="book-title" className="at-title-3">
        {copy.bookTitle(goodName(good))}
      </h2>
      {orders.isError ? <p role="alert">{copy.loadFailed}</p> : null}
      {orders.isSuccess && rows.length === 0 ? (
        <p className={styles.muted}>{copy.noBuyOrders}</p>
      ) : null}
      {rows.length > 0 ? (
        <div className={styles.tableScroll}>
          <table className={styles.table} aria-labelledby="book-title">
            <thead>
              <tr>
                <th scope="col">{copy.buyer}</th>
                <th scope="col" className={styles.number}>
                  {copy.wanted}
                </th>
                <th scope="col" className={styles.number}>
                  {copy.upTo}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((order) => (
                <tr key={order.order_id}>
                  <td>{order.buyer_name}</td>
                  <td className={styles.number}>{order.remaining}</td>
                  <td className={styles.number}>{formatMoney(order.limit_price, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </Panel>
  );
}
