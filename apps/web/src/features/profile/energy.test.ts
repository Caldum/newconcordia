import { describe, expect, it } from 'vitest';

import { energyAt, foodState, refreshInMs } from './energy';
import type { EnergyReading } from './energy';

const minute = 60_000;

// The server said 80 at 15:00:20 its time, with 2 of appetite settled at 15:00 and a Q2 (4) as the next meal.
// This browser's clock runs 2 minutes behind.
const reading: EnergyReading = {
  energy: 80,
  energyMax: 100,
  appetite: 2,
  appetiteMax: 10,
  perInterval: 2,
  intervalMs: minute,
  foodAt: Date.parse('2026-10-08T15:00:00Z'),
  nextMealEnergy: 4,
  checkedAt: Date.parse('2026-10-08T15:00:20Z'),
  receivedAt: Date.parse('2026-10-08T14:58:20Z'),
};
const browserAt = (serverIso: string) => Date.parse(serverIso) - 2 * minute;

describe('energyAt', () => {
  it('fills the appetite smoothly, 2 a minute, toward the next meal', () => {
    expect(energyAt(reading, browserAt('2026-10-08T15:00:30Z'))).toEqual({
      energy: 80,
      energyMax: 100,
      appetite: 3,
      fed: true,
      nextMealAt: browserAt('2026-10-08T15:01:00Z'),
      filling: true,
    });
  });

  it('stops at what the meal gives until the server says it was eaten', () => {
    const view = energyAt(reading, browserAt('2026-10-08T15:05:00Z'));
    expect(view.appetite).toBe(4);
    expect(view.energy).toBe(80);
    expect(view.filling).toBe(false);
  });

  it('waits for as many minutes as the meal needs', () => {
    const q5 = { ...reading, appetite: 0, nextMealEnergy: 10 };
    expect(energyAt(q5, reading.receivedAt).nextMealAt).toBe(browserAt('2026-10-08T15:05:00Z'));
  });

  it('without food the appetite still fills, up to 10, but nothing will be eaten', () => {
    const hungry = { ...reading, nextMealEnergy: null };
    expect(energyAt(hungry, browserAt('2026-10-08T15:30:00Z'))).toMatchObject({
      appetite: 10,
      fed: false,
      nextMealAt: null,
    });
  });

  it('never fills past what is missing, so a meal larger than that waits', () => {
    const almost = { ...reading, energy: 98, appetite: 0, nextMealEnergy: 4 };
    expect(energyAt(almost, browserAt('2026-10-08T15:10:00Z'))).toMatchObject({
      appetite: 2,
      fed: false,
      nextMealAt: null,
    });
  });

  it('a full bar has no appetite', () => {
    const full = { ...reading, energy: 100, appetite: 0 };
    expect(energyAt(full, browserAt('2026-10-08T15:10:00Z'))).toMatchObject({
      energy: 100,
      appetite: 0,
      nextMealAt: null,
    });
  });
});

describe('refreshInMs', () => {
  it('reads again just after the next meal', () => {
    expect(refreshInMs(reading, reading.receivedAt)).toBe(40_000 + 1000);
  });

  it('falls back to a slow refresh when no meal is coming', () => {
    expect(refreshInMs({ ...reading, nextMealEnergy: null }, reading.receivedAt)).toBe(5 * minute);
  });
});

describe('foodState', () => {
  const at = (r: EnergyReading) => foodState(r, energyAt(r, r.receivedAt));
  it('says whether the bar is full, eating, waiting or hungry', () => {
    expect(at({ ...reading, energy: 100, appetite: 0 })).toBe('full');
    expect(at(reading)).toBe('eating');
    expect(at({ ...reading, energy: 98, appetite: 0 })).toBe('waiting');
    expect(at({ ...reading, nextMealEnergy: null })).toBe('hungry');
  });
});
