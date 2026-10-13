import { Note } from '@concordia/atlas/Note';
import { useState } from 'react';

import styles from '../../features/economy/economy.module.css';
import { useMarketSummary } from '../../features/market/queries';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { useCountryName } from '../../features/world/useNames';
import { formatPercent, useLocale, useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import { GoodMarket } from './GoodMarket';
import { MarketGoodPicker } from './MarketGoodPicker';
import { MarketTabs } from './MarketTabs';
import { messages } from './messages';

/** `/market` (Market canvas): buy in the market of the player's country, one good at a time. */
export function MarketPage() {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);
  const { locale } = useLocale();
  const citizen = useCurrentCitizen();
  const countryName = useCountryName();
  const summary = useMarketSummary(citizen.country_code);
  const [good, setGood] = useState('food_q1');
  const goods = summary.data ?? [];
  const current = goods.find((row) => row.good_code === good);

  return (
    <main className={styles.page}>
      <MarketTabs />
      <div className={styles.intro}>
        <h1 className="at-title-1">{copy.title(countryName(citizen.country_code))}</h1>
        {current ? (
          <p className="at-body-l">
            {copy.intro(formatPercent(current.vat, locale), formatPercent(current.tariff, locale))}
          </p>
        ) : null}
      </div>
      {summary.isError ? <Note tone="error">{copy.loadFailed}</Note> : null}
      <MarketGoodPicker goods={goods} selected={good} onSelect={setGood} />
      {current ? <GoodMarket key={good} summary={current} /> : null}
    </main>
  );
}
