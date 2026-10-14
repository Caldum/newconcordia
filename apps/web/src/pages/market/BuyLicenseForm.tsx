import { Button } from '@concordia/atlas/Button';
import { Panel } from '@concordia/atlas/Panel';
import { useId, useState } from 'react';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { buyMarketLicense } from '../../features/market/api';
import { licensableMarkets } from '../../features/market/markets';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { useCountryName } from '../../features/world/useNames';
import { useWorld } from '../../features/world/useWorld';
import { useMessages } from '../../i18n';

import { licensesMessages } from './licensesMessages';

interface BuyLicenseFormProps {
  /** Markets the player already holds a license for. */
  held: readonly string[];
  /** The price in Gold, formatted. */
  price: string;
}

/** Buying a license for one more foreign market. */
export function BuyLicenseForm({ held, price }: BuyLicenseFormProps) {
  const copy = useMessages(licensesMessages);
  const citizen = useCurrentCitizen();
  const countryName = useCountryName();
  const world = useWorld();
  const selectId = useId();
  const options = licensableMarkets(
    [...(world.data?.countries.values() ?? [])],
    citizen.country_code,
    held,
  ).sort((a, b) => countryName(a).localeCompare(countryName(b)));
  const [chosen, setChosen] = useState<string | null>(null);
  const market = chosen !== null && options.includes(chosen) ? chosen : (options[0] ?? null);
  const purchase = useGameAction((key, code: string) => buyMarketLicense(code, key), {
    refreshes: [['market']],
  });

  return (
    <Panel className={styles.panel} aria-labelledby="buy-license-title">
      <h2 id="buy-license-title" className="at-title-3">
        {copy.buyTitle}
      </h2>
      <ActionFeedback
        problem={purchase.problem}
        copy={copy}
        success={
          purchase.succeeded && purchase.variables
            ? copy.bought(countryName(purchase.variables))
            : null
        }
      />
      {market === null ? (
        <p className={styles.muted}>{copy.noneLeft}</p>
      ) : (
        <>
          <div className={styles.field}>
            <label htmlFor={selectId} className={styles.label}>
              {copy.country}
            </label>
            <select
              id={selectId}
              className={styles.select}
              value={market}
              onChange={(event) => {
                setChosen(event.target.value);
                purchase.changed();
              }}
            >
              {options.map((code) => (
                <option key={code} value={code}>
                  {countryName(code)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Button
              size="large"
              disabled={purchase.pending}
              onClick={() => {
                purchase.run(market);
              }}
            >
              {copy.buy(price)}
            </Button>
          </div>
        </>
      )}
    </Panel>
  );
}
