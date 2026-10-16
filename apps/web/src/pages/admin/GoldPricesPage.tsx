import { Note } from '@concordia/atlas/Note';
import { Panel } from '@concordia/atlas/Panel';

import { AdminOnly } from '../../features/admin/AdminOnly';
import { useCurrentStaff } from '../../features/admin/CurrentStaff';
import { useGoldPrices } from '../../features/admin/queries';
import type { GoldPrice } from '../../features/admin/queries';
import { useMessages } from '../../i18n';

import styles from './AdminPage.module.css';
import { ConsolePage } from './ConsolePage';
import { goldMessages } from './goldMessages';
import { GoldPriceItem } from './GoldPriceItem';

const categories: readonly GoldPrice['category'][] = [
  'companies',
  'politics',
  'training',
  'health',
  'war',
  'market',
];

/** `/admin/gold`: every GOLD payment, grouped, with its price and how it is split. */
export function GoldPricesPage() {
  const copy = useMessages(goldMessages);
  const admin = useCurrentStaff().role === 'admin';
  const prices = useGoldPrices(admin);
  const rows = prices.data ?? [];
  return (
    <ConsolePage title={copy.title} intro={copy.intro}>
      <AdminOnly>
        {prices.isError ? <Note tone="error">{copy.loadFailed}</Note> : null}
        {categories.map((category) => {
          const items = rows.filter((row) => row.category === category);
          if (items.length === 0) return null;
          return (
            <Panel key={category} className={styles.section} aria-labelledby={`gold-${category}`}>
              <h2 id={`gold-${category}`} className="at-title-3">
                {copy[`category_${category}`]}
              </h2>
              <ul className={styles.list}>
                {items.map((price) => (
                  <GoldPriceItem key={price.key} price={price} />
                ))}
              </ul>
            </Panel>
          );
        })}
      </AdminOnly>
    </ConsolePage>
  );
}
