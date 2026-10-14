import { Note } from '@concordia/atlas/Note';
import { useState } from 'react';

import styles from '../../features/economy/economy.module.css';
import { useMarketSummary } from '../../features/market/queries';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { useCountryName } from '../../features/world/useNames';
import { formatPercent, useLocale, useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import { GoodMarket } from './GoodMarket';
import { MarketChoice } from './MarketChoice';
import { MarketGoodPicker } from './MarketGoodPicker';
import { MarketTabs } from './MarketTabs';
import { messages } from './messages';
import { useTradableMarkets } from './useTradableMarkets';

/** `/market` (Market canvas): buy in the player's market, or a licensed one, one good at a time. */
export function MarketPage() {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);
  const { locale } = useLocale();
  const citizen = useCurrentCitizen();
  const countryName = useCountryName();
  const markets = useTradableMarkets();
  const [market, setMarket] = useState(citizen.country_code);
  const summary = useMarketSummary(market);
  const [good, setGood] = useState('food_q1');
  const goods = summary.data ?? [];
  const current = goods.find((row) => row.good_code === good);

  return (
    <main className={styles.page}>
      <MarketTabs />
      <div className={styles.intro}>
        <h1 className="at-title-1">{copy.title(countryName(market))}</h1>
        {current ? (
          <p className="at-body-l">
            {copy.intro(formatPercent(current.vat, locale), formatPercent(current.tariff, locale))}
          </p>
        ) : null}
      </div>
      <MarketChoice markets={markets} selected={market} onChange={setMarket} />
      {summary.isError ? <Note tone="error">{copy.loadFailed}</Note> : null}
      <MarketGoodPicker goods={goods} selected={good} onSelect={setGood} />
      {current ? <GoodMarket key={`${market}:${good}`} market={market} summary={current} /> : null}
    </main>
  );
}
