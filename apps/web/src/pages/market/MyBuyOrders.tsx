import { Button } from '@concordia/atlas/Button';
import { Panel } from '@concordia/atlas/Panel';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { useGoodName } from '../../features/economy/goods';
import { cancelBuyOrder } from '../../features/market/api';
import { useMyBuyOrders } from '../../features/market/queries';
import { formatMoney, useLocale, useMessages } from '../../i18n';

import { ordersMessages } from './ordersMessages';

/** The player's open buy orders: what is left, what each holds, and cancelling them. */
export function MyBuyOrders() {
  const copy = useMessages(ordersMessages);
  const { locale } = useLocale();
  const goodName = useGoodName();
  const orders = useMyBuyOrders();
  const cancel = useGameAction((_, orderId: number) => cancelBuyOrder(orderId), {
    refreshes: [['market']],
  });
  const rows = orders.data ?? [];

  return (
    <Panel className={styles.panel} aria-labelledby="my-orders-title">
      <h2 id="my-orders-title" className="at-title-3">
        {copy.mineTitle}
      </h2>
      <ActionFeedback
        problem={cancel.problem}
        copy={copy}
        success={cancel.succeeded ? copy.cancelled : null}
      />
      {orders.isSuccess && rows.length === 0 ? <p className={styles.muted}>{copy.noMine}</p> : null}
      <ul className={styles.recipes}>
        {rows.map((order) => (
          <li key={order.order_id}>
            <span>
              {copy.mine(
                order.remaining,
                order.quantity,
                goodName(order.good_code),
                formatMoney(order.limit_price, locale),
              )}
              <br />
              <span className={styles.muted}>
                {copy.held(formatMoney(order.held, locale))}
                {order.company_name ? ` · ${copy.toDepot(order.company_name)}` : null}
              </span>
            </span>
            <Button
              variant="ghost"
              disabled={cancel.pending}
              aria-label={copy.cancelLabel(goodName(order.good_code))}
              onClick={() => {
                cancel.run(order.order_id);
              }}
            >
              {copy.cancel}
            </Button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
