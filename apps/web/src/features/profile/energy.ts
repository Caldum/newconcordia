/** One reading of the player's energy from the server, with every instant in epoch milliseconds. */
export interface EnergyReading {
  energy: number;
  energyMax: number;
  energyPerHour: number;
  /** Server time of the next point; null when the bar is full. */
  nextEnergyAt: number | null;
  /** Server time of the reading. */
  checkedAt: number;
  /** Browser time when the reading arrived. */
  receivedAt: number;
}

const hourMs = 60 * 60 * 1000;

/**
 * Energy to show at a browser instant, following the server's recharge between readings. For display
 * only: the database decides what an action can spend. Instants are shifted by the gap between the two
 * clocks, so a browser with the wrong time still counts right.
 */
export function energyAt(
  reading: EnergyReading,
  now: number,
): { energy: number; nextAt: number | null } {
  const { energy, energyMax, energyPerHour, nextEnergyAt } = reading;
  if (nextEnergyAt === null || energy >= energyMax) return { energy, nextAt: null };

  const skew = reading.checkedAt - reading.receivedAt;
  const serverNow = now + skew;
  const pointMs = hourMs / energyPerHour;
  const gained =
    serverNow < nextEnergyAt ? 0 : 1 + Math.floor((serverNow - nextEnergyAt) / pointMs);
  const current = Math.min(energyMax, energy + gained);
  if (current >= energyMax) return { energy: current, nextAt: null };
  return { energy: current, nextAt: nextEnergyAt + gained * pointMs - skew };
}
