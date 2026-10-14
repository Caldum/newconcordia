import { Note } from '@concordia/atlas/Note';
import { Panel } from '@concordia/atlas/Panel';
import { useId, useState } from 'react';

import styles from '../../features/economy/economy.module.css';
import { useFxSummary } from '../../features/fx/queries';
import { useMyOffice } from '../../features/politics/queries';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { useCountryName } from '../../features/world/useNames';
import { formatMoney, useLocale, useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { MarketTabs } from '../market/MarketTabs';

import { FxBook } from './FxBook';
import { FxOfferForm } from './FxOfferForm';
import { messages } from './messages';
import { MyFxOffers } from './MyFxOffers';

/** `/market/fx`: the <currency>/GOLD book of each country in play, posting and taking offers. */
export function FxPage() {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);
  const { locale } = useLocale();
  const citizen = useCurrentCitizen();
  const countryName = useCountryName();
  const summary = useFxSummary();
  const isGovernor = useMyOffice().data?.office === 'central_bank_governor';
  const pairId = useId();
  const [chosen, setChosen] = useState<string | null>(null);
  const [bankChoice, setBankChoice] = useState(false);
  const pairs = summary.data ?? [];
  const currency =
    chosen ??
    pairs.find((p) => p.currency_code === citizen.country_code)?.currency_code ??
    pairs[0]?.currency_code ??
    '';
  const pair = pairs.find((p) => p.currency_code === currency);
  const asBank = isGovernor && bankChoice;
  const price = (value: number | null | undefined) =>
    value === null || value === undefined ? copy.none : formatMoney(value, locale);

  return (
    <main className={styles.page}>
      <MarketTabs />
      <div className={styles.intro}>
        <h1 className="at-title-1">{copy.title}</h1>
        <p className="at-body-l">{copy.intro}</p>
      </div>
      {summary.isError ? <Note tone="error">{copy.loadFailed}</Note> : null}
      <Panel className={styles.panel}>
        <div className={styles.field}>
          <label htmlFor={pairId} className={styles.label}>
            {copy.pair}
          </label>
          <select
            id={pairId}
            className={styles.select}
            value={currency}
            onChange={(event) => {
              setChosen(event.target.value);
            }}
          >
            {pairs.map((p) => (
              <option key={p.currency_code} value={p.currency_code}>
                {copy.credit(countryName(p.currency_code))}
              </option>
            ))}
          </select>
        </div>
        {pair ? (
          <p className={styles.muted}>
            {copy.summary(price(pair.best_sell), price(pair.best_buy), price(pair.last_price))}
          </p>
        ) : null}
        {isGovernor ? (
          <label>
            <input
              type="checkbox"
              checked={bankChoice}
              onChange={(event) => {
                setBankChoice(event.target.checked);
              }}
            />{' '}
            {copy.asBank}
            <br />
            <span className={styles.muted}>{copy.asBankHint}</span>
          </label>
        ) : null}
      </Panel>
      {currency ? (
        <div className={styles.layout}>
          <div className={styles.column}>
            <FxBook currency={currency} asBank={asBank} />
          </div>
          <div className={styles.column}>
            <FxOfferForm currency={currency} asBank={asBank} />
            <MyFxOffers asBank={asBank} />
          </div>
        </div>
      ) : null}
    </main>
  );
}
