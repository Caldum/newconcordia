import { Panel } from '@concordia/atlas/Panel';
import { useId, useState } from 'react';

import styles from '../../features/economy/economy.module.css';
import { useGoodName } from '../../features/economy/goods';
import { useMarketOffers } from '../../features/market/queries';
import type { MarketSummary } from '../../features/market/queries';
import { sortOffers } from '../../features/market/square';
import type { OfferSort, Ticket, TicketLine } from '../../features/market/square';
import { formatMoney, formatPercent, useLocale, useMessages } from '../../i18n';

import market from './MarketPage.module.css';
import { messages } from './messages';
import { OffersTable } from './OffersTable';

interface OffersPanelProps {
  market: string;
  good: string;
  summary: MarketSummary | undefined;
  ticket: Ticket;
  onLine: (line: TicketLine) => void;
}

const SORTS: readonly OfferSort[] = ['cheapest', 'dearest', 'largest'];

/** The offers of the chosen good, how many there are and in what order, each with a quantity for the ticket. */
export function OffersPanel({ market: country, good, summary, ticket, onLine }: OffersPanelProps) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const goodName = useGoodName();
  const sortId = useId();
  const [sort, setSort] = useState<OfferSort>('cheapest');
  const offers = useMarketOffers(country, good);
  const rows = sortOffers(offers.data ?? [], sort);
  const fee = summary ? formatPercent(summary.fee, locale) : null;

  return (
    <Panel className={styles.panel} aria-labelledby="offers-title">
      <div className={styles.panelHead}>
        <h2 id="offers-title" className="at-title-3">
          {copy.offers(goodName(good))}
        </h2>
        <div className={market.sort}>
          <label htmlFor={sortId} className="at-support">
            {copy.sort}
          </label>
          <select
            id={sortId}
            className={market.sortSelect}
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as OfferSort);
            }}
          >
            {SORTS.map((option) => (
              <option key={option} value={option}>
                {copy[`sort_${option}`]}
              </option>
            ))}
          </select>
        </div>
      </div>
      {offers.isSuccess ? <p className="at-support">{copy.offersFound(rows.length)}</p> : null}
      {offers.isSuccess && rows.length === 0 ? <p>{copy.noOffers}</p> : null}
      {rows.length > 0 ? (
        <OffersTable offers={rows} good={good} ticket={ticket} onLine={onLine} />
      ) : null}
      {summary && fee ? (
        <p className={styles.muted}>
          {summary.average_24h === null
            ? copy.noAverage(fee)
            : copy.average(formatMoney(summary.average_24h, locale), fee)}
        </p>
      ) : null}
    </Panel>
  );
}
