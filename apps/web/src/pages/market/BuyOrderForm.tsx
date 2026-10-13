import { Button } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { Panel } from '@concordia/atlas/Panel';
import { useState } from 'react';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { parseAmount } from '../../features/ledger/amount';
import { postBuyOrder } from '../../features/market/api';
import type { NewBuyOrder } from '../../features/market/api';
import type { MarketSummary } from '../../features/market/queries';
import { lockedAmount, parseUnits } from '../../features/market/units';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { formatMoney, useLocale, useMessages } from '../../i18n';

import { OrderGoodSelect } from './OrderGoodSelect';
import { ordersMessages } from './ordersMessages';
import { PurchaseDestination } from './PurchaseDestination';

interface BuyOrderFormProps {
  goods: readonly MarketSummary[];
  /** The chosen good's market facts. */
  summary: MarketSummary;
  onSelectGood: (good: string) => void;
}

/** Posting a buy order: what, how many, the highest price per unit, where to, and what it holds. */
export function BuyOrderForm({ goods, summary, onSelectGood }: BuyOrderFormProps) {
  const copy = useMessages(ordersMessages);
  const { locale } = useLocale();
  const citizen = useCurrentCitizen();
  const [quantityText, setQuantityText] = useState('1');
  const [priceText, setPriceText] = useState('');
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const publish = useGameAction((key, order: NewBuyOrder) => postBuyOrder(order, key), {
    refreshes: [['market']],
    onSuccess: () => {
      setChecked(false);
    },
  });
  const quantity = parseUnits(quantityText);
  const limitPrice = parseAmount(priceText);
  const bestOffer =
    summary.best_price === null
      ? copy.noOffer
      : copy.bestOffer(formatMoney(summary.best_price, locale));

  /** Any change is a new request: a new key, and the last outcome no longer applies. */
  const edit = (apply: () => void) => {
    apply();
    publish.changed();
  };

  return (
    <Panel className={styles.panel} aria-labelledby="buy-order-title">
      <form
        className={styles.form}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setChecked(true);
          if (quantity === 0 || limitPrice === null) return;
          publish.run({
            goodCode: summary.good_code,
            quantity,
            limitPrice,
            marketCountryCode: citizen.country_code,
            companyId,
          });
        }}
      >
        <h2 id="buy-order-title" className="at-title-3">
          {copy.formTitle}
        </h2>
        <OrderGoodSelect
          goods={goods}
          selected={summary.good_code}
          onChange={(good) => {
            edit(() => {
              onSelectGood(good);
            });
          }}
        />
        <Field
          label={copy.quantity}
          value={quantityText}
          inputMode="numeric"
          autoComplete="off"
          error={checked && quantity === 0 ? copy.quantityInvalid : undefined}
          onChange={(event) => {
            edit(() => {
              setQuantityText(event.target.value);
            });
          }}
        />
        <Field
          label={copy.limitPrice}
          hint={`${copy.limitPriceHint} ${bestOffer}`}
          value={priceText}
          inputMode="decimal"
          autoComplete="off"
          error={checked && limitPrice === null ? copy.priceInvalid : undefined}
          onChange={(event) => {
            edit(() => {
              setPriceText(event.target.value);
            });
          }}
        />
        <PurchaseDestination
          companyId={companyId}
          onChange={(id) => {
            edit(() => {
              setCompanyId(id);
            });
          }}
        />
        <dl className={styles.lines}>
          <div>
            <dt>{copy.locked}</dt>
            <dd>{formatMoney(lockedAmount(limitPrice, quantity), locale)}</dd>
          </div>
        </dl>
        <p className={styles.muted}>{copy.lockedHint}</p>
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
