export type FxSide = 'sell_gold' | 'buy_gold';

/**
 * The national currency exchanged for an amount of GOLD at a price, both in hundredths: price is the currency per
 * 1 GOLD. The database rounds this side down to the hundredth, and so does this.
 */
export function fxCurrency(goldHundredths: number, price: number): number {
  return Math.floor((goldHundredths * price) / 100);
}

/** What an offer locks when posted: the GOLD for sale, or the currency it would pay rounded up. */
export function fxLock(side: FxSide, goldHundredths: number, price: number): number {
  return side === 'sell_gold' ? goldHundredths : Math.ceil((goldHundredths * price) / 100);
}
