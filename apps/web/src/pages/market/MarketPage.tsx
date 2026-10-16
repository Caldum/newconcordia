import { Note } from '@concordia/atlas/Note';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';

import styles from '../../features/economy/economy.module.css';
import { useMarketSummary } from '../../features/market/queries';
import { firstGoodOf, setLine } from '../../features/market/square';
import type { MarketCategory, Ticket, TicketLine } from '../../features/market/square';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { useCountryName, useRegionOwner } from '../../features/world/useNames';
import { formatPercent, useLocale, useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import { MarketFilters } from './MarketFilters';
import market from './MarketPage.module.css';
import { MarketStatsBar } from './MarketStatsBar';
import { MarketTabs } from './MarketTabs';
import { messages } from './messages';
import { OffersPanel } from './OffersPanel';
import { TicketPanel } from './TicketPanel';

/**
 * `/market` (ADR 0048): the market of the country the player is in. Filters by category and quality, offers
 * with a quantity each, and a ticket that buys them all at once. The figures are for the government only.
 */
export function MarketPage() {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);
  const { locale } = useLocale();
  const citizen = useCurrentCitizen();
  const countryName = useCountryName();
  const regionOwner = useRegionOwner();
  const country = regionOwner(citizen.region_code) || citizen.country_code;
  const summary = useMarketSummary(country);
  const [category, setCategory] = useState<MarketCategory>('food');
  const [good, setGood] = useState(firstGoodOf('food'));
  const [ticket, setTicket] = useState<Ticket>([]);
  const current = summary.data?.find((row) => row.good_code === good);
  const vat = summary.data?.[0]?.vat ?? 0;

  return (
    <main className={styles.page}>
      <MarketTabs />
      <div className={market.head}>
        <div className={styles.intro}>
          <span className={market.eyebrow}>{copy.eyebrow}</span>
          <h1 className="at-title-1">{copy.squareTitle}</h1>
          {summary.data?.[0] ? (
            <p className="at-support">
              {copy.squareIntro(
                countryName(country),
                formatPercent(summary.data[0].vat, locale),
                formatPercent(summary.data[0].tariff, locale),
              )}
            </p>
          ) : null}
        </div>
        <Link to="/market/sell" className={market.publish}>
          {copy.publish}
        </Link>
      </div>
      <MarketStatsBar country={country} />
      {summary.isError ? <Note tone="error">{copy.loadFailed}</Note> : null}
      <MarketFilters
        category={category}
        good={good}
        onCategory={(next) => {
          setCategory(next);
          setGood(firstGoodOf(next));
        }}
        onGood={setGood}
      />
      <div className={styles.layout}>
        <OffersPanel
          key={`${country}:${good}`}
          market={country}
          good={good}
          summary={current}
          ticket={ticket}
          onLine={(line: TicketLine) => {
            setTicket((previous) => setLine(previous, line));
          }}
        />
        <TicketPanel
          ticket={ticket}
          vat={vat}
          onLine={(line: TicketLine) => {
            setTicket((previous) => setLine(previous, line));
          }}
          onBought={() => {
            setTicket([]);
          }}
        />
      </div>
    </main>
  );
}
