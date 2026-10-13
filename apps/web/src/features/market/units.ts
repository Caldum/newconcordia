/** Whole units up to 999,999, or 0. */
export function parseUnits(text: string): number {
  return /^\d{1,6}$/.test(text.trim()) ? Number(text.trim()) : 0;
}

/** What a buy order locks while it waits: its limit per unit times the units, in hundredths. */
export function lockedAmount(limitPrice: number | null, quantity: number): number {
  return limitPrice === null ? 0 : limitPrice * quantity;
}
