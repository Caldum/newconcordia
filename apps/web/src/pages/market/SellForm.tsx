import { Button } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { Panel } from '@concordia/atlas/Panel';
import { useState } from 'react';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { parseAmount } from '../../features/ledger/amount';
import { postOffer } from '../../features/market/api';
import type { NewOffer } from '../../features/market/api';
import { useMarketSummary } from '../../features/market/queries';
import type { SellSource } from '../../features/market/sellSources';
import { saleTotals } from '../../features/market/totals';
import { parseUnits } from '../../features/market/units';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { formatPercent, useLocale, useMessages } from '../../i18n';

import { MarketChoice } from './MarketChoice';
import { messages } from './messages';
import { SaleLines } from './SaleLines';
import { SellSourceSelect } from './SellSourceSelect';
import { useTradableMarkets } from './useTradableMarkets';

/** Posting an offer: where, what, how many, the unit price against the 24-hour average, and what it yields. */
export function SellForm({ sources }: { sources: readonly SellSource[] }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const citizen = useCurrentCitizen();
  const markets = useTradableMarkets();
  const [marketCode, setMarketCode] = useState(citizen.country_code);
  const summary = useMarketSummary(marketCode);
  // The export tax is the production country's; the player's own goods are made at home.
  const home = useMarketSummary(citizen.country_code);
  const [selectedId, setSelectedId] = useState(sources[0]?.id ?? '');
  const [quantityText, setQuantityText] = useState('1');
  const [priceText, setPriceText] = useState('');
  const [checked, setChecked] = useState(false);
  const publish = useGameAction((key, offer: NewOffer) => postOffer(offer, key), {
    refreshes: [['market']],
    onSuccess: () => {
      setChecked(false);
    },
  });

  const source = sources.find((item) => item.id === selectedId) ?? sources[0];
  const quantity = parseUnits(quantityText);
  const price = parseAmount(priceText);
  const market = summary.data?.find((row) => row.good_code === source?.good);
  const vat = market?.vat ?? 0;
  const fee = market?.fee ?? 0;
  const exported = marketCode !== citizen.country_code;
  const exportTax = exported
    ? (home.data?.find((row) => row.good_code === source?.good)?.export_tax ?? 0)
    : 0;
  const validQuantity = source !== undefined && quantity > 0 && quantity <= source.available;
  const average = market?.average_24h ?? null;
  const comparison =
    average !== null && price !== null && price !== average
      ? price > average
        ? copy.aboveAverage(formatPercent(price / average - 1, locale))
        : copy.belowAverage(formatPercent(1 - price / average, locale))
      : undefined;

  /** Any change is a new request: a new key, and the last outcome no longer applies. */
  const edit = (apply: () => void) => {
    apply();
    publish.changed();
  };

  return (
    <Panel className={styles.panel} aria-labelledby="sell-title">
      <form
        className={styles.form}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setChecked(true);
          if (!source || !validQuantity || price === null) return;
          publish.run({
            goodCode: source.good,
            quantity,
            price,
            marketCountryCode: marketCode,
            companyId: source.company?.id ?? null,
          });
        }}
      >
        <h2 id="sell-title" className="at-title-3">
          {copy.what}
        </h2>
        <MarketChoice
          markets={markets}
          selected={marketCode}
          onChange={(code) => {
            edit(() => {
              setMarketCode(code);
            });
          }}
        />
        <SellSourceSelect
          sources={sources}
          selectedId={source?.id ?? ''}
          onChange={(id) => {
            edit(() => {
              setSelectedId(id);
            });
          }}
        />
        <Field
          label={copy.quantity}
          value={quantityText}
          inputMode="numeric"
          autoComplete="off"
          error={checked && !validQuantity ? copy.quantityInvalid : undefined}
          onChange={(event) => {
            edit(() => {
              setQuantityText(event.target.value);
            });
          }}
        />
        <Field
          label={copy.unitPrice}
          hint={comparison ?? copy.unitPriceHint}
          value={priceText}
          inputMode="decimal"
          autoComplete="off"
          error={checked && price === null ? copy.error_amount_invalid : undefined}
          onChange={(event) => {
            edit(() => {
              setPriceText(event.target.value);
            });
          }}
        />
        <SaleLines
          totals={saleTotals(price ?? 0, quantity, vat, fee, exportTax)}
          vat={vat}
          fee={fee}
          exportTax={exported ? exportTax : null}
        />
        <ActionFeedback
          problem={publish.problem}
          copy={copy}
          success={publish.succeeded ? copy.published : null}
        />
        <div>
          <Button type="submit" size="large" disabled={publish.pending}>
            {copy.publish}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
