import { useMarketStats } from '../../features/market/queries';
import { changeOf } from '../../features/market/square';
import { useMyOffice } from '../../features/politics/queries';
import { useCountryName } from '../../features/world/useNames';
import { formatMoney, formatNumber, formatPercent, useLocale, useMessages } from '../../i18n';
import type { Locale } from '../../i18n';

import market from './MarketPage.module.css';
import { messages } from './messages';

/** «+8,4 %» or «−2,1 %»: a change against the 24 hours before. */
function signedPercent(change: number, locale: Locale): string {
  const text = formatPercent(Math.abs(change), locale, 1);
  return change > 0 ? `+${text}` : change < 0 ? `−${text}` : text;
}

/**
 * The market's figures (ADR 0048): volume and average ticket of the last 24 hours, and the active offers. Only
 * for the president and the minister of the economy, of their own country's market; the database refuses the
 * rest.
 */
export function MarketStatsBar({ country }: { country: string }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const countryName = useCountryName();
  const office = useMyOffice().data ?? null;
  const allowed =
    office !== null &&
    office.country_code === country &&
    (office.office === 'president' || office.office === 'minister_economy');
  const stats = useMarketStats(country, allowed).data ?? null;
  if (!allowed || !stats) return null;
  const volumeChange = changeOf(stats.volume_24h, stats.volume_prev_24h);
  const ticketChange = changeOf(stats.average_ticket_24h, stats.average_ticket_prev_24h);

  return (
    <section className={market.stats} aria-label={copy.stats(countryName(country))}>
      <dl>
        <div>
          <dt>{copy.volume24h}</dt>
          <dd>{formatMoney(stats.volume_24h, locale)}</dd>
          {volumeChange === null ? null : (
            <dd className={volumeChange < 0 ? market.down : market.up}>
              {signedPercent(volumeChange, locale)}
            </dd>
          )}
        </div>
        <div>
          <dt>{copy.averageTicket}</dt>
          <dd>
            {stats.average_ticket_24h === null
              ? '—'
              : formatMoney(stats.average_ticket_24h, locale)}
          </dd>
          {ticketChange === null ? null : (
            <dd className={ticketChange < 0 ? market.down : market.up}>
              {signedPercent(ticketChange, locale)}
            </dd>
          )}
        </div>
        <div>
          <dt>{copy.activeOffers}</dt>
          <dd>{formatNumber(stats.active_offers, locale)}</dd>
          <dd className={market.note}>
            {copy.offersToday(formatNumber(stats.offers_today, locale))}
          </dd>
        </div>
      </dl>
      <p className={market.note}>{copy.statsNote}</p>
    </section>
  );
}
