import type { ReactNode } from 'react';

import { useRovingRadio } from '../useRovingRadio';

import styles from './Option.module.css';

export interface OptionItem<Value extends string> {
  value: Value;
  /** Name of the option. Countries and regions are place names. */
  title: ReactNode;
  /** One line that helps decide, or the reason it is unavailable. */
  description?: ReactNode;
  /** Color swatch, flag or silhouette before the name. */
  media?: ReactNode;
  disabled?: boolean;
  /** Set the title in the place-name type (EB Garamond italic). */
  place?: boolean;
}

interface OptionGroupProps<Value extends string> {
  label: string;
  options: readonly OptionItem<Value>[];
  value: Value | null;
  onChange: (value: Value) => void;
}

/** Large single-choice options with context (where to start, attack type, law type). */
export function OptionGroup<Value extends string>({
  label,
  options,
  value,
  onChange,
}: OptionGroupProps<Value>) {
  const { onKeyDown, radioProps } = useRovingRadio(options, value, onChange);
  return (
    // eslint-disable-next-line jsx-a11y/interactive-supports-focus -- composite widget: focus lives on its options (roving tabindex), as WAI-ARIA prescribes.
    <div role="radiogroup" aria-label={label} className={styles.group} onKeyDown={onKeyDown}>
      {options.map((option) => (
        <button key={option.value} type="button" className={styles.option} {...radioProps(option)}>
          <span className={styles.circle} aria-hidden="true" />
          {option.media}
          <span className={styles.text}>
            <span
              className={option.place ? `${styles.title} at-place` : `${styles.title} at-title-3`}
            >
              {option.title}
            </span>
            {option.description ? (
              <span className={styles.description}>{option.description}</span>
            ) : null}
          </span>
        </button>
      ))}
    </div>
  );
}
