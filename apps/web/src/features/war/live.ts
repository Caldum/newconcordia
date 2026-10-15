// Pure rules of the live independence war screen: progress, the countdown, the minute-by-minute pulse and which
// strikes are new since the last refresh.

/** Share of the damage target already reached, between 0 and 1. */
export function liberationShare(total: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(1, Math.max(0, total / target));
}

/** Whole percentage of a share, never rounding up to 100 before it is reached. */
export function wholePercent(share: number): number {
  return share >= 1 ? 100 : Math.min(99, Math.round(share * 100));
}

export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/** Time left until `endsAt`, never negative. */
export function countdown(endsAt: string, now: number): Countdown {
  const left = Math.max(0, Math.floor((Date.parse(endsAt) - now) / 1000));
  return {
    days: Math.floor(left / 86_400),
    hours: Math.floor((left % 86_400) / 3600),
    minutes: Math.floor((left % 3600) / 60),
    seconds: left % 60,
  };
}

/** «2 d 04:05:09» or «04:05:09». */
export function formatCountdown({ days, hours, minutes, seconds }: Countdown): string {
  const clock = [hours, minutes, seconds].map((n) => String(n).padStart(2, '0')).join(':');
  return days > 0 ? `${String(days)} d ${clock}` : clock;
}

export interface PulseMinute {
  minute: string;
  damage: number;
  strikes: number;
  fighters: number;
}

export const PULSE_MINUTES = 30;

/** The last 30 minutes ending at `now`, oldest first, with empty minutes filled in. */
export function fillPulse(rows: readonly PulseMinute[], now: number): PulseMinute[] {
  const current = Math.floor(now / 60_000) * 60_000;
  const byMinute = new Map(
    rows.map((row) => [Math.floor(Date.parse(row.minute) / 60_000) * 60_000, row]),
  );
  return Array.from({ length: PULSE_MINUTES }, (_, index) => {
    const at = current - (PULSE_MINUTES - 1 - index) * 60_000;
    const row = byMinute.get(at);
    return {
      minute: new Date(at).toISOString(),
      damage: row?.damage ?? 0,
      strikes: row?.strikes ?? 0,
      fighters: row?.fighters ?? 0,
    };
  });
}

/** Ids in `current` that were not in `previous`: the strikes to highlight. Nothing is new on the first read. */
export function newStrikeIds(
  previous: readonly { attack_id: number }[] | undefined,
  current: readonly { attack_id: number }[],
): Set<number> {
  if (previous === undefined) return new Set();
  const seen = new Set(previous.map((strike) => strike.attack_id));
  return new Set(current.filter((strike) => !seen.has(strike.attack_id)).map((s) => s.attack_id));
}

/** A UUID for the n-th strike of a burst, derived from the burst's key so a retry repeats the same strikes. */
export function strikeKey(burstKey: string, index: number): string {
  return `${burstKey.slice(0, -2)}${(index & 0xff).toString(16).padStart(2, '0')}`;
}
