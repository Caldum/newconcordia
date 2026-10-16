import { Icon } from '@concordia/atlas/Icon';

import { qualityOf, useGoodName } from '../../features/economy/goods';
import { goodsOf, MARKET_CATEGORIES } from '../../features/market/square';
import type { MarketCategory } from '../../features/market/square';
import { useMessages } from '../../i18n';

import market from './MarketPage.module.css';
import { messages } from './messages';

interface MarketFiltersProps {
  category: MarketCategory;
  good: string;
  onCategory: (category: MarketCategory) => void;
  onGood: (good: string) => void;
}

/** A category, then one quality of it (or one raw material): the market always shows one good. */
export function MarketFilters({ category, good, onCategory, onGood }: MarketFiltersProps) {
  const copy = useMessages(messages);
  const goodName = useGoodName();
  return (
    <section className={market.filters} aria-label={copy.filters}>
      <div role="group" aria-labelledby="market-category" className={market.chips}>
        <span id="market-category" className={market.chipsLabel}>
          {copy.category}
        </span>
        {MARKET_CATEGORIES.map((option) => (
          <button
            key={option}
            type="button"
            className={market.chip}
            aria-pressed={option === category}
            onClick={() => {
              onCategory(option);
            }}
          >
            {copy[`category_${option}`]}
          </button>
        ))}
      </div>
      <div role="group" aria-labelledby="market-quality" className={market.chips}>
        <span id="market-quality" className={market.chipsLabel}>
          {category === 'raw' ? copy.rawKind : copy.quality}
        </span>
        {goodsOf(category).map((option) => {
          const quality = qualityOf(option);
          return (
            <button
              key={option}
              type="button"
              className={market.chip}
              aria-pressed={option === good}
              onClick={() => {
                onGood(option);
              }}
            >
              {quality === null ? (
                goodName(option)
              ) : (
                <>
                  <Icon name="star" size={14} />
                  {`Q${String(quality)}`}
                </>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
