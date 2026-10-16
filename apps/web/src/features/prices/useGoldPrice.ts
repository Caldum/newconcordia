import { useLocale } from '../../i18n';

import { describeGoldPrice } from './goldPrice';
import type { GoldPriceText } from './goldPrice';
import { useGoldPrices } from './queries';

const loading: GoldPriceText = { price: '…', country: '…', game: '…', shared: false };

/** A GOLD price in words for the screen that charges it; «…» until the prices arrive. */
export function useGoldPrice(key: string): GoldPriceText {
  const { locale } = useLocale();
  const price = useGoldPrices().data?.find((row) => row.key === key);
  return price ? describeGoldPrice(price, locale) : loading;
}
