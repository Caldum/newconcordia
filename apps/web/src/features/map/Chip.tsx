import styles from './SelectionPanel.module.css';

export function Chip({ color }: { color: string | null | undefined }) {
  return (
    <span
      className={styles.chip}
      style={{ background: color ?? 'var(--country-inactive)' }}
      aria-hidden="true"
    />
  );
}
