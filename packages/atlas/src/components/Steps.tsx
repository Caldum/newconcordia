import { cx } from '../cx';

import styles from './Steps.module.css';

interface StepsProps {
  /** Name of the flow, for screen readers: «Pasos del registro». */
  label: string;
  steps: readonly string[];
  /** Zero-based index of the current step. */
  current: number;
}

/** Step indicator for multi-screen flows. Only when the order is real. */
export function Steps({ label, steps, current }: StepsProps) {
  return (
    <ol className={styles.steps} aria-label={label}>
      {steps.map((step, index) => (
        <li
          key={step}
          className={cx(
            styles.step,
            index < current && styles.done,
            index === current && styles.current,
          )}
          {...(index === current ? { 'aria-current': 'step' } : {})}
        >
          {`${index + 1}. ${step}`}
        </li>
      ))}
    </ol>
  );
}
