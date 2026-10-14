import { Panel } from '@concordia/atlas/Panel';

import { useEconomySnapshots } from '../../features/admin/queries';
import styles from '../../features/economy/economy.module.css';
import { formatMoney, useLocale, useMessages } from '../../i18n';

import { economyMessages } from './economyMessages';

/** Balance telemetry: per day and currency, money created, destroyed, in hands and held. */
export function EconomySection() {
  const copy = useMessages(economyMessages);
  const { locale } = useLocale();
  const snapshots = useEconomySnapshots(true);
  const rows = snapshots.data ?? [];

  return (
    <Panel className={styles.panel} aria-labelledby="economy-title">
      <h2 id="economy-title" className="at-title-3">
        {copy.title}
      </h2>
      <p className={styles.muted}>{copy.hint}</p>
      {snapshots.isSuccess && rows.length === 0 ? (
        <p className={styles.muted}>{copy.none}</p>
      ) : null}
      {rows.length > 0 ? (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">{copy.day}</th>
                <th scope="col">{copy.currency}</th>
                <th scope="col" className={styles.number}>
                  {copy.minted}
                </th>
                <th scope="col" className={styles.number}>
                  {copy.burned}
                </th>
                <th scope="col" className={styles.number}>
                  {copy.circulating}
                </th>
                <th scope="col" className={styles.number}>
                  {copy.held}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.game_day}-${r.currency_code}`}>
                  <td>{r.game_day}</td>
                  <td>{r.currency_code}</td>
                  <td className={styles.number}>{formatMoney(r.minted, locale)}</td>
                  <td className={styles.number}>{formatMoney(r.burned, locale)}</td>
                  <td className={styles.number}>{formatMoney(r.circulating, locale)}</td>
                  <td className={styles.number}>{formatMoney(r.held, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </Panel>
  );
}
