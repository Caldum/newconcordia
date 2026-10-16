import type { AdminLogEntry } from '../../features/admin/queries';
import { formatDate } from '../../i18n';
import type { Locale } from '../../i18n';

/** A game day (YYYY-MM-DD) as an instant inside that day, for formatting. */
export function dayToDate(day: string): string {
  return `${day}T12:00:00Z`;
}

const longest = 60;

/**
 * A logged state in words: switches as «encendido» or «apagado», the day a change applies as a date, and any other
 * value as «key: value» («price: 6000, reason: Más partidos serios»).
 */
export function describeState(
  state: AdminLogEntry['before'],
  copy: { on: string; off: string },
  locale: Locale,
): string {
  if (!state) return '—';
  const parts: string[] = [];
  for (const [key, value] of Object.entries(state)) {
    if (typeof value === 'boolean') parts.push(value ? copy.on : copy.off);
    else if (key === 'apply_on' && typeof value === 'string') {
      parts.push(formatDate(dayToDate(value), locale));
    } else if (typeof value === 'number') parts.push(`${key}: ${String(value)}`);
    else if (typeof value === 'string' && value !== '') {
      parts.push(`${key}: ${value.length > longest ? `${value.slice(0, longest)}…` : value}`);
    }
  }
  return parts.join(', ') || '—';
}
