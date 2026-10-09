import type { ReactNode } from 'react';

import { cx } from '../cx';

import styles from './Scoreboard.module.css';

export interface ScoreboardSide {
  /** Country name, set as a place name. */
  country: string;
  /** Whole percentage of the damage, 0 to 100. */
  percent: number;
  /** Role in words: «Defiende su región», «Ataca por mar». */
  role: string;
  /** The player's own country uses nation-on-ink; the rival war-on-ink. */
  tone: 'own' | 'rival';
}

interface ScoreboardProps {
  /** Spoken summary: «Argentina 58 %, España 42 %, ronda 3 de 5». */
  summary: string;
  left: ScoreboardSide;
  right: ScoreboardSide;
  /** The disputed region's Silhouette, split by damage. */
  region: ReactNode;
}

function Side({ side }: { side: ScoreboardSide }) {
  return (
    <div className={styles.side} aria-hidden="true">
      <span className={cx(styles.country, 'at-place')}>{side.country}</span>
      <span className={cx(styles.percent, styles[side.tone], 'at-score')}>
        {side.percent}
        <span className={styles.unit}>%</span>
      </span>
      <span className={styles.role}>{side.role}</span>
    </div>
  );
}

/** A battle's scoreboard on ink: both countries, their damage share and the disputed region. */
export function Scoreboard({ summary, left, right, region }: ScoreboardProps) {
  return (
    <div className={styles.scoreboard} role="group" aria-label={summary}>
      <Side side={left} />
      <div className={styles.region}>{region}</div>
      <Side side={right} />
      <p className="at-visually-hidden">{`${left.role}. ${right.role}.`}</p>
    </div>
  );
}
