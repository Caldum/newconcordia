import { Link } from '@tanstack/react-router';

import { useMessages } from '../../i18n';

import market from './MarketPage.module.css';
import { messages } from './messages';
import { ordersMessages } from './ordersMessages';

const current = {
  activeProps: { 'aria-current': 'page' as const },
  activeOptions: { exact: true },
};

/** Buying and selling, the two sides of the market. */
export function MarketTabs() {
  const copy = useMessages(messages);
  const orders = useMessages(ordersMessages);
  return (
    <nav aria-label={copy.tabs} className={market.tabs}>
      <Link to="/market" {...current}>
        {copy.buyTab}
      </Link>
      <Link to="/market/sell" {...current}>
        {copy.sellTab}
      </Link>
      <Link to="/market/orders" {...current}>
        {orders.ordersTab}
      </Link>
    </nav>
  );
}
