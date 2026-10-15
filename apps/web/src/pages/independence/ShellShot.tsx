import type { CSSProperties } from 'react';

import { sceneBox } from '../../features/war/battlefield';

import styles from './Battlefield.module.css';
import { effectSprites } from './sprites';

interface ShellShotProps {
  from: readonly [number, number];
  to: readonly [number, number];
  /** Milliseconds before the shell leaves the barrel. */
  delay: number;
  /** «−14», drawn over the impact; none for the occupier's background fire. */
  label?: string;
  /** The player's own strike, in gold. */
  mine?: boolean;
  /** The occupier fires right to left. */
  reverse?: boolean;
}

/**
 * A shot: the shell flying in an arc from the muzzle, the blast and its smoke, and the damage rising. Each piece
 * only animates transform and opacity, which the compositor runs off the main thread.
 */
export function ShellShot({
  from,
  to,
  delay,
  label,
  mine = false,
  reverse = false,
}: ShellShotProps) {
  const timing = (offset: number): CSSProperties => ({
    animationDelay: `${String(delay + offset)}ms`,
  });
  // The flight in scene units; the CSS turns them into the scene's width (container units).
  const flight = {
    '--dx': String(to[0] - from[0]),
    '--dy': String(to[1] - from[1]),
  } as CSSProperties;

  return (
    <div className={mine ? styles.mine : undefined}>
      <span className={styles.anchor} style={sceneBox(from[0], from[1])}>
        <img
          className={reverse ? `${styles.shell} ${styles.shellReverse}` : styles.shell}
          style={{ ...flight, ...timing(0) }}
          src={effectSprites.shell}
          alt=""
        />
      </span>
      <span className={styles.anchor} style={sceneBox(to[0], to[1])}>
        <img className={styles.ring} style={timing(480)} src={effectSprites.ring} alt="" />
        <img className={styles.blast} style={timing(480)} src={effectSprites.blast} alt="" />
        <img className={styles.smoke} style={timing(700)} src={effectSprites.smoke} alt="" />
        {label ? (
          <span className={styles.hit} style={timing(520)} data-hit="">
            {label}
          </span>
        ) : null}
      </span>
    </div>
  );
}
