import { Panel } from '@concordia/atlas/Panel';

import styles from '../../features/economy/economy.module.css';
import { useGoodName } from '../../features/economy/goods';
import { useHospitalStock } from '../../features/health/queries';
import { useRegionName } from '../../features/world/useNames';
import { formatNumber, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';

/** Kits in Health's store and each hospital: private to the Health minister and the president. */
export function HospitalStockPanel() {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const regionName = useRegionName();
  const goodName = useGoodName();
  const stock = useHospitalStock();
  const rows = stock.data ?? [];

  return (
    <Panel className={styles.panel} aria-labelledby="hospital-stock-title">
      <h2 id="hospital-stock-title" className="at-title-3">
        {copy.stockTitle}
      </h2>
      <p className={styles.muted}>{copy.stockPrivate}</p>
      {stock.isSuccess && rows.length === 0 ? <p className={styles.muted}>{copy.noStock}</p> : null}
      <ul className={styles.recipes}>
        {rows.map((line) => (
          <li key={`${line.region_code ?? 'store'}-${line.good_code}`}>
            {copy.stockLine(
              line.region_code ? regionName(line.region_code) : copy.store,
              goodName(line.good_code),
              formatNumber(line.quantity, locale),
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
