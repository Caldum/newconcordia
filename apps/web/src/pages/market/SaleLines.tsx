import styles from '../../features/economy/economy.module.css';
import type { SaleTotals } from '../../features/market/totals';
import { formatMoney, formatPercent, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';

interface SaleLinesProps {
  totals: SaleTotals;
  vat: number;
  fee: number;
}

/** What the seller receives if everything sells: the price minus VAT and the market fee. */
export function SaleLines({ totals, vat, fee }: SaleLinesProps) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  return (
    <>
      <h3 className="at-title-3">{copy.ifAllSells}</h3>
      <dl className={styles.lines}>
        <div>
          <dt>{copy.totalPrice}</dt>
          <dd>{formatMoney(totals.gross, locale)}</dd>
        </div>
        <div>
          <dt>{copy.vatToTreasury(formatPercent(vat, locale))}</dt>
          <dd>{formatMoney(-totals.vat, locale)}</dd>
        </div>
        <div>
          <dt>{copy.marketFee(formatPercent(fee, locale))}</dt>
          <dd>{formatMoney(-totals.fee, locale)}</dd>
        </div>
        <div>
          <dt>{copy.youReceive}</dt>
          <dd>{formatMoney(totals.net, locale)}</dd>
        </div>
      </dl>
    </>
  );
}
