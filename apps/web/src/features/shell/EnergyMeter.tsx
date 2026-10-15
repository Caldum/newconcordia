import type { EnergyView } from '../profile/energy';

import meter from './EnergyMeter.module.css';
import styles from './Sidebar.module.css';

interface EnergyMeterProps {
  view: EnergyView;
  label: string;
  valueText: string;
}

const percent = (value: number, max: number) =>
  `${String(Math.round(Math.min(1, Math.max(0, value / max)) * 1000) / 10)}%`;

/**
 * The energy bar: the energy there is, and after it the appetite filling toward the next meal (ADR 0047). The
 * appetite is paler, and paler still when no meal is coming. Only widths change, with a short transition.
 */
export function EnergyMeter({ view, label, valueText }: EnergyMeterProps) {
  return (
    <div
      className={`${styles.energyTrack} ${meter.track}`}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={view.energyMax}
      aria-valuenow={view.energy}
      aria-valuetext={valueText}
    >
      <span className={meter.fill} style={{ width: percent(view.energy, view.energyMax) }} />
      <span
        className={view.fed ? meter.appetite : `${meter.appetite} ${meter.hungry}`}
        data-fed={view.fed}
        style={{ width: percent(view.appetite, view.energyMax) }}
      />
    </div>
  );
}
