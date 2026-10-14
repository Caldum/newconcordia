import { Panel } from '@concordia/atlas/Panel';
import { useState } from 'react';

import styles from '../../features/economy/economy.module.css';
import { useGoodName } from '../../features/economy/goods';
import { useMarketOffers } from '../../features/market/queries';
import type { MarketSummary } from '../../features/market/queries';
import { formatMoney, formatPercent, useLocale, useMessages } from '../../i18n';

import { MarketOffersTable } from './MarketOffersTable';
import { messages } from './messages';
import { PurchasePanel } from './PurchasePanel';

interface GoodMarketProps {
  /** The country whose market is shown. */
  market: string;
  summary: MarketSummary;
}

/** The offers of one good, cheapest first, and buying from the chosen one. */
export function GoodMarket({ market, summary }: GoodMarketProps) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const goodName = useGoodName();
  const offers = useMarketOffers(market, summary.good_code);
  const [chosenId, setChosenId] = useState<number | null>(null);
  const rows = offers.data ?? [];
  // The cheapest offer is chosen until the player picks another.
  const chosen = rows.find((offer) => offer.offer_id === chosenId) ?? rows[0] ?? null;
  const fee = formatPercent(summary.fee, locale);

  return (
    <div className={styles.layout}>
      <Panel className={styles.panel} aria-labelledby="offers-title">
        <h2 id="offers-title" className="at-title-3">
          {copy.offers(goodName(summary.good_code))}
        </h2>
        {offers.isSuccess && rows.length === 0 ? <p>{copy.noOffers}</p> : null}
        {rows.length > 0 ? (
          <MarketOffersTable
            offers={rows}
            chosenId={chosen?.offer_id ?? null}
            onChoose={setChosenId}
          />
        ) : null}
        <p className={styles.muted}>
          {summary.average_24h === null
            ? copy.noAverage(fee)
            : copy.average(formatMoney(summary.average_24h, locale), fee)}
        </p>
      </Panel>
      {chosen ? (
        <PurchasePanel key={chosen.offer_id} offer={chosen} summary={summary} />
      ) : (
        <Panel className={styles.panel}>
          <p>{copy.pickOffer}</p>
        </Panel>
      )}
    </div>
  );
}
