import { Note } from '@concordia/atlas/Note';
import { useState } from 'react';

import styles from '../../features/economy/economy.module.css';
import { useMarketSummary } from '../../features/market/queries';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { useCountryName } from '../../features/world/useNames';
import { useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import { BuyOrderBook } from './BuyOrderBook';
import { BuyOrderForm } from './BuyOrderForm';
import { MarketTabs } from './MarketTabs';
import { MyBuyOrders } from './MyBuyOrders';
import { ordersMessages } from './ordersMessages';

/** `/market/orders`: post buy orders in the player's market, see who else buys, cancel the own ones. */
export function OrdersPage() {
  const copy = useMessages(ordersMessages);
  useDocumentTitle(copy.documentTitle);
  const citizen = useCurrentCitizen();
  const countryName = useCountryName();
  const summary = useMarketSummary(citizen.country_code);
  const [good, setGood] = useState('food_q1');
  const goods = summary.data ?? [];
  const current = goods.find((row) => row.good_code === good) ?? goods[0];

  return (
    <main className={styles.page}>
      <MarketTabs />
      <div className={styles.intro}>
        <h1 className="at-title-1">{copy.title}</h1>
        <p className="at-body-l">{copy.intro(countryName(citizen.country_code))}</p>
      </div>
      {summary.isError ? <Note tone="error">{copy.loadFailed}</Note> : null}
      {current ? (
        <div className={styles.layout}>
          <BuyOrderForm goods={goods} summary={current} onSelectGood={setGood} />
          <div className={styles.column}>
            <BuyOrderBook good={current.good_code} />
            <MyBuyOrders />
          </div>
        </div>
      ) : null}
    </main>
  );
}
