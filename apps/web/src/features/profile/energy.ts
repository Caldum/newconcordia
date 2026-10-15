/** One reading of the player's energy from the server, with every instant in epoch milliseconds (ADR 0047). */
export interface EnergyReading {
  energy: number;
  energyMax: number;
  /** Energy food may restore, as settled at `foodAt`. */
  appetite: number;
  appetiteMax: number;
  /** Appetite built up each interval. */
  perInterval: number;
  intervalMs: number;
  /** Server time of the last settled interval. */
  foodAt: number;
  /** What the lowest-quality food held gives; null without food. */
  nextMealEnergy: number | null;
  /** Server time of the reading. */
  checkedAt: number;
  /** Browser time when the reading arrived. */
  receivedAt: number;
}

export interface EnergyView {
  energy: number;
  energyMax: number;
  /** Appetite now, filling smoothly between intervals. */
  appetite: number;
  /** Whether a meal is coming; false without food or when the next one is bigger than what is missing. */
  fed: boolean;
  /** Browser time of the next meal; null when none is coming. */
  nextMealAt: number | null;
  /** Whether the appetite is still rising, so the bar should keep moving. */
  filling: boolean;
}

/** When nothing is coming, the profile is read again this often. */
const idleRefreshMs = 5 * 60_000;
/** Read a little after the meal's interval, once the server has settled it. */
const settleMarginMs = 1000;

/**
 * Energy and appetite to show at a browser instant. For display only: the database decides what is eaten and
 * what an action can spend. Instants are shifted by the gap between the two clocks, so a browser with the wrong
 * time still counts right.
 */
export function energyAt(reading: EnergyReading, now: number): EnergyView {
  const {
    energy,
    energyMax,
    appetite,
    appetiteMax,
    perInterval,
    intervalMs,
    foodAt,
    nextMealEnergy,
  } = reading;
  const skew = reading.checkedAt - reading.receivedAt;
  const missing = Math.max(0, energyMax - energy);
  const fed = nextMealEnergy !== null && nextMealEnergy <= missing;
  const cap = Math.min(appetiteMax, missing, fed ? nextMealEnergy : Infinity);
  const elapsed = Math.max(0, now + skew - foodAt);
  const filled = Math.min(cap, appetite + (perInterval * elapsed) / intervalMs);
  const nextMealAt = fed
    ? foodAt + Math.max(1, Math.ceil((nextMealEnergy - appetite) / perInterval)) * intervalMs - skew
    : null;
  return {
    energy,
    energyMax,
    appetite: Math.max(0, filled),
    fed,
    nextMealAt,
    filling: filled < cap,
  };
}

/** How long until the profile is worth reading again: just after the next meal, or a slow refresh. */
export function refreshInMs(reading: EnergyReading, now: number): number {
  const { nextMealAt } = energyAt(reading, now);
  if (nextMealAt === null) return idleRefreshMs;
  return Math.max(settleMarginMs, nextMealAt - now + settleMarginMs);
}

/** What the bar is doing: full, eating, waiting for more to be missing (a meal bigger than that), or hungry. */
export type FoodState = 'full' | 'eating' | 'waiting' | 'hungry';

export function foodState(reading: EnergyReading, view: EnergyView): FoodState {
  if (view.energy >= view.energyMax) return 'full';
  if (view.fed) return 'eating';
  return reading.nextMealEnergy === null ? 'hungry' : 'waiting';
}
