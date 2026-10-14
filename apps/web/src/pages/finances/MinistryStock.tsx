import { Panel } from '@concordia/atlas/Panel';

import styles from '../../features/economy/economy.module.css';
import { useGoodName } from '../../features/economy/goods';
import { useMinistryStock } from '../../features/finance/queries';
import type { MinistryCode } from '../../features/politics/billTerms';
import { formatNumber, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';

/** A ministry's inventory, private to its minister and the president. */
export function MinistryStock({ ministry }: { ministry: MinistryCode }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const goodName = useGoodName();
  const stock = useMinistryStock(ministry);
  const rows = stock.data ?? [];
  const titleId = `stock-${ministry}`;

  return (
    <Panel className={styles.panel} aria-labelledby={titleId}>
      <h2 id={titleId} className="at-title-3">
        {copy.stockTitle(copy[`institution_${ministry}`])}
      </h2>
      <p className={styles.muted}>{copy.stockPrivate}</p>
      {stock.isSuccess && rows.length === 0 ? <p className={styles.muted}>{copy.noStock}</p> : null}
      <ul className={styles.recipes}>
        {rows.map((line) => (
          <li key={`${line.good_code}-${line.origin_country_code}`}>
            <span>{goodName(line.good_code)}</span>
            <span>{copy.units(formatNumber(line.quantity, locale))}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
