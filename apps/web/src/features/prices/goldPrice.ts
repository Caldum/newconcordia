import { formatMoney } from '../../i18n';
import type { Locale } from '../../i18n';

import type { PublicGoldPrice } from './queries';

/** A GOLD price in words, with how it splits, ready for copy: «50», «12,50». */
export interface GoldPriceText {
  price: string;
  /** What goes to a country's treasury. */
  country: string;
  /** What leaves the game. */
  game: string;
  /** Whether a country receives anything. */
  shared: boolean;
}

/** Hundredths as copy writes GOLD: whole amounts without decimals. */
export function goldAmount(hundredths: number, locale: Locale): string {
  return formatMoney(hundredths, locale, { whole: hundredths % 100 === 0 });
}

/** The price and its split as the database makes it (the country's share rounded down). */
export function describeGoldPrice(price: PublicGoldPrice, locale: Locale): GoldPriceText {
  const country =
    price.beneficiary === 'none' ? 0 : Math.floor((price.price * price.country_share_bp) / 10000);
  return {
    price: goldAmount(price.price, locale),
    country: goldAmount(country, locale),
    game: goldAmount(price.price - country, locale),
    shared: country > 0,
  };
}
