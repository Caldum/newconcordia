import type { AdminLogEntry } from '../../features/admin/queries';
import { formatDate } from '../../i18n';
import type { Locale } from '../../i18n';

/** A game day (YYYY-MM-DD) as an instant inside that day, for formatting. */
export function dayToDate(day: string): string {
  return `${day}T12:00:00Z`;
}

/** A logged state ({"is_active": false, "apply_on": "2026-10-10"}) in words: «apagado, 10 de octubre». */
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
    }
  }
  return parts.join(', ') || '—';
}
