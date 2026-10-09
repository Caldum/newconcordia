import { describe, expect, it } from 'vitest';

import { energyAt } from './energy';
import type { EnergyReading } from './energy';

const minute = 60_000;

// The server said 80 at 15:00 its time, next point at 15:06. This browser's clock runs 2 minutes behind.
const reading: EnergyReading = {
  energy: 80,
  energyMax: 100,
  energyPerHour: 10,
  nextEnergyAt: Date.parse('2026-10-08T15:06:00Z'),
  checkedAt: Date.parse('2026-10-08T15:00:00Z'),
  receivedAt: Date.parse('2026-10-08T14:58:00Z'),
};

describe('energyAt', () => {
  it('shows what the server said until the next point arrives', () => {
    expect(energyAt(reading, reading.receivedAt)).toEqual({
      energy: 80,
      nextAt: reading.receivedAt + 6 * minute,
    });
    expect(energyAt(reading, reading.receivedAt + 5 * minute).energy).toBe(80);
  });

  it('adds a point every 6 minutes on the server clock', () => {
    expect(energyAt(reading, reading.receivedAt + 6 * minute)).toEqual({
      energy: 81,
      nextAt: reading.receivedAt + 12 * minute,
    });
    expect(energyAt(reading, reading.receivedAt + 3 * 60 * minute + 6 * minute).energy).toBe(100);
  });

  it('never goes above the maximum, and a full bar has no next point', () => {
    expect(energyAt(reading, reading.receivedAt + 24 * 60 * minute)).toEqual({
      energy: 100,
      nextAt: null,
    });
    const full = { ...reading, energy: 100, nextEnergyAt: null };
    expect(energyAt(full, reading.receivedAt + 60 * minute)).toEqual({ energy: 100, nextAt: null });
  });

  it('keeps energy above the maximum as it is', () => {
    const fed = { ...reading, energy: 150, nextEnergyAt: null };
    expect(energyAt(fed, reading.receivedAt + 60 * minute)).toEqual({ energy: 150, nextAt: null });
  });
});
