import { Panel } from '@concordia/atlas/Panel';

import { useMessages } from '../../i18n';
import styles from '../economy/economy.module.css';
import { useMyInventory } from '../market/queries';

import { InventoryItem } from './InventoryItem';
import panel from './InventoryPanel.module.css';
import { messages } from './messages';
import { useGoodsEffects } from './queries';
import { UseKitButton } from './UseKitButton';

/** The player's goods and what each is for; food is eaten automatically, kits are used here (Inventory canvas). */
export function InventoryPanel() {
  const copy = useMessages(messages);
  const inventory = useMyInventory();
  const effects = useGoodsEffects();
  const rows = inventory.data ?? [];
  const effectOf = (code: string) => effects.data?.find((effect) => effect.code === code);
  const perMeal = effects.data?.[0]?.food_energy_per_interval ?? 0;
  const hasFood = rows.some((line) => effectOf(line.good_code)?.energy);

  return (
    <Panel className={styles.panel} aria-labelledby="inventory-title">
      <h2 id="inventory-title" className="at-title-3">
        {copy.title}
      </h2>
      {inventory.isSuccess && rows.length === 0 ? (
        <p className={styles.muted}>{copy.empty}</p>
      ) : null}
      {hasFood ? <p className={styles.muted}>{copy.autoFood(perMeal)}</p> : null}
      <ul className={panel.items}>
        {rows.map((line) => (
          <InventoryItem key={line.good_code} line={line} effect={effectOf(line.good_code)}>
            {effectOf(line.good_code)?.heal ? <UseKitButton goodCode={line.good_code} /> : null}
          </InventoryItem>
        ))}
      </ul>
    </Panel>
  );
}
