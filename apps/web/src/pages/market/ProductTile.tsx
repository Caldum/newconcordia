import { Icon } from '@concordia/atlas/Icon';
import type { IconName } from '@concordia/atlas/Icon';

import { categoryOf, isRaw, qualityOf, useGoodName } from '../../features/economy/goods';

import market from './MarketPage.module.css';

const ICONS: Record<ReturnType<typeof categoryOf>, IconName> = {
  food: 'food',
  military: 'sword',
  medical: 'medic',
};

/** A good's icon on its category's tint, its name and its quality. */
export function ProductTile({ good }: { good: string }) {
  const goodName = useGoodName();
  const category = categoryOf(good);
  const quality = qualityOf(good);
  return (
    <span className={market.product}>
      <span className={market.productIcon} data-category={category} aria-hidden="true">
        <Icon name={isRaw(good) ? 'box' : ICONS[category]} size={20} />
      </span>
      <span className={market.productName}>
        <span>{goodName(good)}</span>
        {quality === null ? null : <span className={market.quality}>{`Q${String(quality)}`}</span>}
      </span>
    </span>
  );
}
