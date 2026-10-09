/** Largest amount a form accepts, in units: well inside JavaScript's safe integers once in hundredths. */
const maxUnits = 1_000_000_000;

/**
 * «12,50» or «12.5» → 1250 hundredths. Thousands separators are refused rather than guessed, because
 * «1.240» means 1240 in Spanish and 1.24 in English.
 */
export function parseAmount(text: string): number | null {
  const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(text.trim());
  if (!match) return null;
  const units = Number(match[1]);
  const cents = Number((match[2] ?? '').padEnd(2, '0'));
  if (units > maxUnits) return null;
  const hundredths = units * 100 + cents;
  return hundredths > 0 ? hundredths : null;
}

/** Hundredths as an editable amount: «42,00» in Spanish, «42.00» in English, no thousands separator. */
export function amountInput(hundredths: number, locale: 'es' | 'en'): string {
  const text = (hundredths / 100).toFixed(2);
  return locale === 'es' ? text.replace('.', ',') : text;
}
