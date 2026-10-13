import { useGoodName } from '../../features/economy/goods';
import type { MarketSummary } from '../../features/market/queries';
import { formatMoney, useLocale, useMessages } from '../../i18n';

import market from './MarketPage.module.css';
import { messages } from './messages';

interface MarketGoodPickerProps {
  goods: readonly MarketSummary[];
  selected: string;
  onSelect: (good: string) => void;
}

/** Every good of the market with its best price; picking one shows its offers. */
export function MarketGoodPicker({ goods, selected, onSelect }: MarketGoodPickerProps) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const goodName = useGoodName();
  return (
    <section aria-label={copy.goods} className={market.goods}>
      {goods.map((row) => (
        <button
          key={row.good_code}
          type="button"
          className={market.good}
          aria-pressed={row.good_code === selected}
          onClick={() => {
            onSelect(row.good_code);
          }}
        >
          <strong>{goodName(row.good_code)}</strong>{' '}
          <span>
            {row.best_price === null ? copy.none : copy.from(formatMoney(row.best_price, locale))}
          </span>
        </button>
      ))}
    </section>
  );
}
