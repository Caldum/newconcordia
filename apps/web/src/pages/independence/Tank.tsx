import { useEffect, useRef } from 'react';

import {
  FIRE_MS,
  OUR_TANKS,
  sceneBox,
  TANK_FRAME,
  theirTank,
} from '../../features/war/battlefield';

import styles from './Battlefield.module.css';
import { effectSprites, tankStrip } from './sprites';

/** The strip slides from the first frame to the last, one frame at a time (a share of its own width). */
const FIRE_FRAMES: Keyframe[] = [
  { transform: 'translateX(0)' },
  {
    transform: `translateX(-${String(((TANK_FRAME.count - 1) / TANK_FRAME.count) * 100)}%)`,
  },
];

interface TankProps {
  side: 'ours' | 'theirs';
  index: number;
  /** The shot it fires in this volley: its firing frames play after `delay`. Null when it does not fire. */
  fire: { id: number | string; delay: number } | null;
  /** The war is lost for this side: the tank goes dark and smokes. */
  wrecked: boolean;
}

/**
 * One tank, facing the other side: a window on the 12-frame strip. One image that never remounts; each new shot
 * slides it frame by frame (the flash, then the smoke) with a transform the compositor runs off the main thread,
 * and it ends back on the resting frame.
 */
export function Tank({ side, index, fire, wrecked }: TankProps) {
  const strip = useRef<HTMLImageElement>(null);
  const fireId = fire?.id ?? null;
  const fireDelay = fire?.delay ?? 0;

  useEffect(() => {
    const image = strip.current;
    if (fireId === null || !image || typeof image.animate !== 'function') return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const animation = image.animate(FIRE_FRAMES, {
      duration: FIRE_MS,
      delay: fireDelay,
      easing: `steps(${String(TANK_FRAME.count)}, jump-none)`,
    });
    return () => {
      animation.cancel();
    };
  }, [fireId, fireDelay]);

  const spot = side === 'ours' ? OUR_TANKS[index] : theirTank(index);
  if (!spot) return null;
  const look = [styles.window, styles[side], wrecked ? styles.wreck : ''].join(' ').trim();

  return (
    <div className={styles.tank} style={sceneBox(spot.x, spot.y, spot.width, spot.height)}>
      {/* The colors and the mirror live here; the smoke stays outside the filter. */}
      <div className={look}>
        <img ref={strip} className={styles.strip} src={tankStrip} alt="" decoding="async" />
      </div>
      {wrecked
        ? [0, 1, 2].map((puff) => (
            <img
              key={puff}
              className={styles.wreckSmoke}
              style={{ animationDelay: `${String(puff * 0.9)}s` }}
              src={effectSprites.wreckSmoke}
              alt=""
            />
          ))
        : null}
    </div>
  );
}
