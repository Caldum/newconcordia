import { formatNumber, useLocale, useMessages } from '../../i18n';
import styles from '../economy/economy.module.css';
import { isRaw, useGoodName } from '../economy/goods';
import type { InventoryLine } from '../market/queries';

import panel from './InventoryPanel.module.css';
import { messages } from './messages';
import type { GoodEffect } from './queries';

interface InventoryItemProps {
  line: InventoryLine;
  effect: GoodEffect | undefined;
}

/** One good the player holds: its name, how many, and what it is for. */
export function InventoryItem({ line, effect }: InventoryItemProps) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const goodName = useGoodName();
  const description = effect?.energy
    ? copy.food(effect.energy)
    : effect?.heal
      ? copy.kit(effect.heal)
      : effect?.damage_multiplier
        ? copy.weapon(formatNumber(effect.damage_multiplier, locale))
        : line.good_code === 'fuel'
          ? copy.fuel
          : isRaw(line.good_code)
            ? copy.raw
            : '';
  return (
    <li className={panel.item}>
      <div className={panel.itemHead}>
        <strong>{goodName(line.good_code)}</strong>
        <span className="at-figure">{formatNumber(line.quantity, locale)}</span>
      </div>
      <p className={styles.muted}>{description}</p>
    </li>
  );
}
