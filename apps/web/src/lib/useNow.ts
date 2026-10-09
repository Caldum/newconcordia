import { useState } from 'react';

/** The time when the screen opened. Countdowns that tick use their own timer. */
export function useNow(): number {
  const [now] = useState(() => Date.now());
  return now;
}
