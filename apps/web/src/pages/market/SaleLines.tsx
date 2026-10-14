import styles from '../../features/economy/economy.module.css';
import type { SaleTotals } from '../../features/market/totals';
import { formatMoney, formatPercent, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';

interface SaleLinesProps {
  totals: SaleTotals;
  vat: number;
  fee: number;
  /** The export tax rate when selling in another country's market; null at home. */
  exportTax: number | null;
}

/** What the seller receives if everything sells: the price minus VAT, the market fee and any export tax. */
export function SaleLines({ totals, vat, fee, exportTax }: SaleLinesProps) {
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
        {exportTax === null ? null : (
          <div>
            <dt>{copy.exportTax(formatPercent(exportTax, locale))}</dt>
            <dd>{formatMoney(-totals.exportTax, locale)}</dd>
          </div>
        )}
        <div>
          <dt>{copy.youReceive}</dt>
          <dd>{formatMoney(totals.net, locale)}</dd>
        </div>
      </dl>
    </>
  );
}
