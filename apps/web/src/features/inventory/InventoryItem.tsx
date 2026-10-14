import type { ReactNode } from 'react';

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
  /** What the player can do with it, such as using a kit. */
  children?: ReactNode;
}

/** One good the player holds: its name, how many, what it is for, and what to do with it. */
export function InventoryItem({ line, effect, children }: InventoryItemProps) {
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
      {children}
    </li>
  );
}
