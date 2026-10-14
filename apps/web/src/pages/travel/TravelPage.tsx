import { Note } from '@concordia/atlas/Note';
import { Panel } from '@concordia/atlas/Panel';

import styles from '../../features/economy/economy.module.css';
import { useTravelDestinations, useTravelTerms } from '../../features/travel/queries';
import { currencyName } from '../../features/world/currency';
import { useCountryName, useRegionName, useRegionOwner } from '../../features/world/useNames';
import { formatNumber, useLocale, useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import { messages } from './messages';
import { TripForm } from './TripForm';

/** `/travel`: where the player is, what a trip costs today and travelling. */
export function TravelPage() {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);
  const { locale } = useLocale();
  const regionName = useRegionName();
  const countryName = useCountryName();
  const regionOwner = useRegionOwner();
  const terms = useTravelTerms();
  const destinations = useTravelDestinations();
  const data = terms.data;
  const rate = data ? Math.round(data.rate) : 0;
  const money = data ? (currencyName(rate, data.currency_code, locale) ?? data.currency_code) : '';
  return (
    <main className={styles.page}>
      <div className={styles.intro}>
        <h1 className="at-title-1">{copy.title}</h1>
        <p className="at-body-l">{copy.intro}</p>
      </div>
      {terms.isError || destinations.isError ? <Note tone="error">{copy.loadFailed}</Note> : null}
      {data ? (
        <div className={styles.layout}>
          <div className={styles.column}>
            <Panel className={styles.panel} aria-labelledby="travel-here">
              <h2 id="travel-here" className="at-title-3">
                {copy.hereTitle}
              </h2>
              <p className="at-place-s">
                {copy.here(
                  regionName(data.region_code),
                  countryName(regionOwner(data.region_code)),
                )}
              </p>
              <p className={styles.muted}>
                {data.rate_from_market
                  ? copy.rateMarket(formatNumber(rate, locale), money)
                  : copy.rateFallback(formatNumber(rate, locale), money)}
              </p>
            </Panel>
          </div>
          {data.enabled ? (
            destinations.data ? (
              <TripForm destinations={destinations.data} currency={data.currency_code} />
            ) : null
          ) : (
            <Note tone="info">{copy.closed}</Note>
          )}
        </div>
      ) : null}
    </main>
  );
}
