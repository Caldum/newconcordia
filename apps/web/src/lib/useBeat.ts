import { useEffect, useState } from 'react';

/** A counter that goes up every `ms` while `enabled`: for scenes that repeat something on their own rhythm. */
export function useBeat(ms: number, enabled = true): number {
  const [beat, setBeat] = useState(0);
  useEffect(() => {
    if (!enabled) return undefined;
    const timer = setInterval(() => {
      setBeat((value) => value + 1);
    }, ms);
    return () => {
      clearInterval(timer);
    };
  }, [ms, enabled]);
  return beat;
}
