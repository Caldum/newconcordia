import { useCallback } from 'react';
import type { KeyboardEvent } from 'react';

import styles from './Segmented.module.css';

export interface Segment<Value extends string> {
  value: Value;
  label: string;
  /** Id of the panel this segment shows, if the caller renders one per segment. */
  controls?: string;
}

interface SegmentedProps<Value extends string> {
  label: string;
  segments: readonly Segment<Value>[];
  value: Value;
  onChange: (value: Value) => void;
}

/** Switches what a screen shows (map layers, filters). It never saves anything. Up to 4 options. */
export function Segmented<Value extends string>({
  label,
  segments,
  value,
  onChange,
}: SegmentedProps<Value>) {
  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const index = segments.findIndex((segment) => segment.value === value);
      const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      if (step === 0) return;
      event.preventDefault();
      const next = segments[(index + step + segments.length) % segments.length];
      if (!next) return;
      onChange(next.value);
      event.currentTarget.querySelector<HTMLElement>(`[data-value="${next.value}"]`)?.focus();
    },
    [segments, value, onChange],
  );

  return (
    // eslint-disable-next-line jsx-a11y/interactive-supports-focus -- composite widget: focus lives on its options (roving tabindex), as WAI-ARIA prescribes.
    <div role="tablist" aria-label={label} className={styles.segmented} onKeyDown={onKeyDown}>
      {segments.map((segment) => {
        const selected = segment.value === value;
        return (
          <button
            key={segment.value}
            type="button"
            role="tab"
            className={styles.segment}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            data-value={segment.value}
            {...(segment.controls ? { 'aria-controls': segment.controls } : {})}
            onClick={() => {
              onChange(segment.value);
            }}
          >
            {segment.label}
          </button>
        );
      })}
    </div>
  );
}

interface SwitchProps {
  /** Name of the setting: «Avisos de batallas». */
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** Turns a setting on or off immediately. */
export function Switch({ label, checked, onChange }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={styles.switch}
      onClick={() => {
        onChange(!checked);
      }}
    >
      <span className={styles.track} aria-hidden="true" />
    </button>
  );
}
