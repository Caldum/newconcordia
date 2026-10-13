import { Button } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { Panel } from '@concordia/atlas/Panel';
import { useState } from 'react';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { useGoodName } from '../../features/economy/goods';
import { buy } from '../../features/market/api';
import type { Purchase } from '../../features/market/api';
import type { MarketOffer, MarketSummary } from '../../features/market/queries';
import { purchaseTotals } from '../../features/market/totals';
import { formatMoney, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';
import { PurchaseDestination } from './PurchaseDestination';
import { PurchaseLines } from './PurchaseLines';

/** Whole units up to 999,999, or 0. */
function parseUnits(text: string): number {
  return /^\d{1,6}$/.test(text.trim()) ? Number(text.trim()) : 0;
}

interface PurchasePanelProps {
  offer: MarketOffer;
  summary: MarketSummary;
}

/** Buying from one offer: how many, where to, what it costs, and the purchase. */
export function PurchasePanel({ offer, summary }: PurchasePanelProps) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const goodName = useGoodName();
  const [quantityText, setQuantityText] = useState('1');
  const [companyId, setCompanyId] = useState<number | null>(null);
  const quantity = parseUnits(quantityText);
  const totals = purchaseTotals(offer.price, quantity, summary.vat, offer.tariff, offer.imported);
  const good = goodName(summary.good_code);
  const purchase = useGameAction((key, order: Purchase) => buy(order, key), {
    refreshes: [['market']],
  });
  const paid = purchase.result ?? totals.total;

  return (
    <Panel className={styles.panel} aria-labelledby="buy-title">
      <h2 id="buy-title" className="at-title-3">
        {copy.buyTitle(good)}
      </h2>
      <p className={styles.muted}>
        {copy.buyFrom(offer.seller_name, formatMoney(offer.price, locale))}
      </p>
      <Field
        label={copy.quantity}
        value={quantityText}
        inputMode="numeric"
        autoComplete="off"
        error={quantity > 0 ? undefined : copy.quantityInvalid}
        onChange={(event) => {
          setQuantityText(event.target.value);
          purchase.changed();
        }}
      />
      <PurchaseDestination
        companyId={companyId}
        onChange={(id) => {
          setCompanyId(id);
          purchase.changed();
        }}
      />
      <PurchaseLines totals={totals} vat={summary.vat} offer={offer} />
      <ActionFeedback
        problem={purchase.problem}
        copy={copy}
        success={
          purchase.succeeded
            ? copy.bought(purchase.variables?.quantity ?? quantity, good, formatMoney(paid, locale))
            : null
        }
      />
      <div>
        <Button
          size="large"
          disabled={purchase.pending || quantity === 0}
          onClick={() => {
            purchase.run({ offerId: offer.offer_id, quantity, companyId });
          }}
        >
          {copy.buy(quantity)}
        </Button>
      </div>
    </Panel>
  );
}
