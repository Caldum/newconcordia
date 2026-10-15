import { describe, expect, it } from 'vitest';

import {
  countdown,
  fillPulse,
  formatCountdown,
  liberationShare,
  newStrikeIds,
  strikeKey,
  wholePercent,
} from './live';

describe('the live independence war', () => {
  it('measures the progress toward the target', () => {
    expect(liberationShare(2500, 10_000)).toBe(0.25);
    expect(liberationShare(12_000, 10_000)).toBe(1);
    expect(liberationShare(10, 0)).toBe(0);
    expect(wholePercent(0.996)).toBe(99);
    expect(wholePercent(1)).toBe(100);
    expect(wholePercent(0.254)).toBe(25);
  });

  it('counts down to the end and never below zero', () => {
    const now = Date.parse('2026-11-07T10:00:00Z');
    expect(formatCountdown(countdown('2026-11-09T14:05:09Z', now))).toBe('2 d 04:05:09');
    expect(formatCountdown(countdown('2026-11-07T10:00:42Z', now))).toBe('00:00:42');
    expect(formatCountdown(countdown('2026-11-07T09:00:00Z', now))).toBe('00:00:00');
  });

  it('fills the last 30 minutes, oldest first', () => {
    const now = Date.parse('2026-11-07T10:29:30Z');
    const pulse = fillPulse(
      [
        { minute: '2026-11-07T10:29:00+00:00', damage: 40, strikes: 3, fighters: 2 },
        { minute: '2026-11-07T10:00:00+00:00', damage: 10, strikes: 1, fighters: 1 },
        { minute: '2026-11-07T09:59:00+00:00', damage: 99, strikes: 9, fighters: 9 },
      ],
      now,
    );
    expect(pulse).toHaveLength(30);
    expect(pulse[0]).toEqual({
      minute: '2026-11-07T10:00:00.000Z',
      damage: 10,
      strikes: 1,
      fighters: 1,
    });
    expect(pulse[29]?.damage).toBe(40);
    expect(pulse[15]?.damage).toBe(0);
  });

  it('marks the strikes that arrived since the last refresh', () => {
    const first = [{ attack_id: 2 }, { attack_id: 1 }];
    expect(newStrikeIds(undefined, first)).toEqual(new Set());
    expect(newStrikeIds(first, [{ attack_id: 4 }, { attack_id: 3 }, { attack_id: 2 }])).toEqual(
      new Set([4, 3]),
    );
  });

  it('derives a stable key for each strike of a burst', () => {
    const key = '0b6f9c3e-5a1d-4c2b-9e7f-1a2b3c4d5e6f';
    expect(strikeKey(key, 0)).toBe('0b6f9c3e-5a1d-4c2b-9e7f-1a2b3c4d5e00');
    expect(strikeKey(key, 4)).toBe('0b6f9c3e-5a1d-4c2b-9e7f-1a2b3c4d5e04');
    expect(strikeKey(key, 4)).toMatch(/^[0-9a-f-]{36}$/);
  });
});
