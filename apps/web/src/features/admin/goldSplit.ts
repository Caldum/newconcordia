import { formatNumber } from '../../i18n';
import type { Locale } from '../../i18n';

/** Whose treasury receives a GOLD price's country share (`none`: the state pays it, all of it leaves the game). */
export type Beneficiary =
  | 'none'
  | 'host_country'
  | 'market_country'
  | 'party_country'
  | 'citizen_country'
  | 'restore_country';

export interface Split {
  /** Hundredths to the country's treasury. */
  country: number;
  /** Hundredths that leave the game (burned). */
  game: number;
}

/** How a price splits, as the database does it: the country's share rounded down, the rest to the game. */
export function splitPrice(price: number, shareBp: number, beneficiary: Beneficiary): Split {
  const country = beneficiary === 'none' ? 0 : Math.floor((price * shareBp) / 10000);
  return { country, game: price - country };
}

/** GOLD as typed (12, 12,5 or 12.50) in hundredths, or null. */
export function parseGold(text: string): number | null {
  const match = /^(\d{1,7})(?:[.,](\d{1,2}))?$/.exec(text.trim());
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
}

/** A percentage as typed (40, 12,5 or 12.25), in basis points 0–10000, or null. */
export function parsePercent(text: string): number | null {
  const match = /^(\d{1,3})(?:[.,](\d{1,2}))?$/.exec(text.trim());
  if (!match) return null;
  const bp = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  return bp <= 10000 ? bp : null;
}

/** Hundredths of GOLD as an editable text, without grouping: 12,5 in Spanish, 12.5 in English. */
export function goldText(hundredths: number, locale: Locale): string {
  const text = String(hundredths / 100);
  return locale === 'es' ? text.replace('.', ',') : text;
}

/** Basis points as an editable percentage text. */
export function percentText(bp: number, locale: Locale): string {
  const text = String(bp / 100);
  return locale === 'es' ? text.replace('.', ',') : text;
}

/** Basis points as a percentage to read: «40 %», «12,5 %». */
export function formatShare(bp: number, locale: Locale): string {
  return formatNumber(bp / 10000, locale, { style: 'percent', maximumFractionDigits: 2 });
}

/** A balance parameter's value as typed: up to ten digits and six decimals, or null. */
export function parseParamValue(text: string): number | null {
  const match = /^(\d{1,10})(?:[.,](\d{1,6}))?$/.exec(text.trim());
  if (!match) return null;
  return Number(`${match[1] ?? '0'}.${match[2] ?? '0'}`);
}
