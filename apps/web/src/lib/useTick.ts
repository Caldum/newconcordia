import { useEffect, useState } from 'react';

/** The current time, updated every `ms` milliseconds: for countdowns and «hace 12 s» labels that move. */
export function useTick(ms = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, ms);
    return () => {
      clearInterval(timer);
    };
  }, [ms]);
  return now;
}
