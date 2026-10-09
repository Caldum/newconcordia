import { useId } from 'react';

import { EnergyIcon } from './GameIcons';
import styles from './Track.module.css';

interface Side {
  name: string;
  /** CSS color, usually `var(--country-xxx)`. */
  color: string;
  /** Formatted share for this side in the active locale: «58 %». */
  valueText: string;
}

interface SplitTrackProps {
  left: Side;
  right: Side;
  /** Left side share between 0 and 1. */
  leftShare: number;
}

/** A battle's damage split: two segments in national colors, with the percentages written below. */
export function SplitTrack({ left, right, leftShare }: SplitTrackProps) {
  const share = Math.min(1, Math.max(0, leftShare));
  return (
    <div className={styles.split}>
      <div className={styles.bar} aria-hidden="true">
        <span style={{ width: toWidth(share), background: left.color }} />
        <span style={{ flex: 1, background: right.color }} />
      </div>
      <p className={styles.legend} style={{ margin: 0 }}>
        <span>{`${left.name} ${left.valueText}`}</span>
        <span>{`${right.valueText} ${right.name}`}</span>
      </p>
    </div>
  );
}

interface MeterProps {
  value: number;
  max: number;
  /** Accessible name: «Energía», «Experiencia». */
  label: string;
  /** Spoken value: «84 de 100». */
  valueText: string;
}

function clampShare(value: number, max: number): number {
  return max <= 0 ? 0 : Math.min(1, Math.max(0, value / max));
}

/** Percentage width with one decimal, free of floating point noise. */
function toWidth(share: number): string {
  return `${Math.round(share * 1000) / 10}%`;
}

/** Energy: bolt, track and the number beside it. Never the bar alone. */
export function EnergyMeter({ value, max, label, valueText }: MeterProps) {
  return (
    <span
      className={styles.energy}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={valueText}
    >
      <EnergyIcon />
      <span className={styles.energyTrack} aria-hidden="true">
        <span style={{ width: toWidth(clampShare(value, max)) }} />
      </span>
      <span aria-hidden="true">{value}</span>
    </span>
  );
}

/** Experience, budget or quota: one ink segment on a light track, labeled by the caller's text. */
export function ProgressMeter({ value, max, label, valueText }: MeterProps) {
  const labelId = useId();
  return (
    <div>
      <span id={labelId} className="at-visually-hidden">
        {label}
      </span>
      <div
        className={styles.meter}
        role="meter"
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={valueText}
      >
        <span style={{ width: toWidth(clampShare(value, max)) }} />
      </div>
    </div>
  );
}
