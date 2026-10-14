import { Button } from '@concordia/atlas/Button';
import { Panel } from '@concordia/atlas/Panel';
import { useId, useState } from 'react';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { travel } from '../../features/travel/api';
import type { Destination } from '../../features/travel/queries';
import { currencyName } from '../../features/world/currency';
import { useCountryName, useRegionName } from '../../features/world/useNames';
import { formatMoney, formatNumber, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';

interface TripFormProps {
  /** Nearest first. */
  destinations: readonly Destination[];
  /** The player's currency, in which the price is paid. */
  currency: string;
}

/** Choosing a destination, with its distance and price, and travelling there. */
export function TripForm({ destinations, currency }: TripFormProps) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const regionName = useRegionName();
  const countryName = useCountryName();
  const selectId = useId();
  const [chosen, setChosen] = useState<string | null>(null);
  const go = useGameAction((key, region: string) => travel(region, key), {
    refreshes: [['war']],
    onSuccess: () => {
      setChosen(null);
    },
  });
  const destination = destinations.find((d) => d.region_code === chosen) ?? destinations[0] ?? null;
  const countries = [...new Set(destinations.map((d) => d.country_code))].sort((a, b) =>
    countryName(a).localeCompare(countryName(b)),
  );
  const price = destination
    ? `${formatMoney(destination.price, locale)} ${
        currencyName(Math.ceil(destination.price / 100), currency, locale) ?? currency
      }`
    : '';

  return (
    <Panel className={styles.panel} aria-labelledby="travel-trip">
      <h2 id="travel-trip" className="at-title-3">
        {copy.tripTitle}
      </h2>
      <ActionFeedback
        problem={go.problem}
        copy={copy}
        success={go.succeeded && go.variables ? copy.traveled(regionName(go.variables)) : null}
      />
      {destination ? (
        <form
          className={styles.form}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            go.run(destination.region_code);
          }}
        >
          <div className={styles.field}>
            <label htmlFor={selectId} className={styles.label}>
              {copy.destination}
            </label>
            <select
              id={selectId}
              className={styles.select}
              value={destination.region_code}
              onChange={(event) => {
                setChosen(event.target.value);
                go.changed();
              }}
            >
              {countries.map((country) => (
                <optgroup key={country} label={countryName(country)}>
                  {destinations
                    .filter((d) => d.country_code === country)
                    .map((d) => (
                      <option key={d.region_code} value={d.region_code}>
                        {regionName(d.region_code)}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </div>
          <dl className={styles.facts}>
            <div>
              <dt>{copy.distance}</dt>
              <dd>{copy.km(formatNumber(Math.round(destination.km), locale))}</dd>
            </div>
            <div>
              <dt>{copy.price}</dt>
              <dd>{price}</dd>
            </div>
          </dl>
          <div>
            <Button type="submit" disabled={go.pending}>
              {copy.travel}
            </Button>
          </div>
        </form>
      ) : null}
    </Panel>
  );
}
