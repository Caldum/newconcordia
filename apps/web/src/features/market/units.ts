/** Whole units up to 999,999, or 0. */
export function parseUnits(text: string): number {
  return /^\d{1,6}$/.test(text.trim()) ? Number(text.trim()) : 0;
}
