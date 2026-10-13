import styles from '../../features/economy/economy.module.css';
import type { MarketOffer } from '../../features/market/queries';
import type { PurchaseTotals } from '../../features/market/totals';
import { formatMoney, formatPercent, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';

interface PurchaseLinesProps {
  totals: PurchaseTotals;
  vat: number;
  offer: MarketOffer;
}

/** The cost of a purchase: subtotal, the VAT inside it, the tariff on imports, and the total. */
export function PurchaseLines({ totals, vat, offer }: PurchaseLinesProps) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  return (
    <dl className={styles.lines}>
      <div>
        <dt>{copy.subtotal}</dt>
        <dd>{formatMoney(totals.gross, locale)}</dd>
      </div>
      <div>
        <dt>{copy.vatIncluded(formatPercent(vat, locale))}</dt>
        <dd>{formatMoney(totals.vat, locale)}</dd>
      </div>
      {offer.imported ? (
        <div>
          <dt>{copy.tariff(formatPercent(offer.tariff, locale))}</dt>
          <dd>{formatMoney(totals.tariff, locale)}</dd>
        </div>
      ) : null}
      <div>
        <dt>{copy.total}</dt>
        <dd>{formatMoney(totals.total, locale)}</dd>
      </div>
    </dl>
  );
}
