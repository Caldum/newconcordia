import type { ReactNode } from 'react';

import { cx } from '../cx';

import { Icon } from './Icon';
import type { IconName } from './Icon';
import styles from './Note.module.css';

export type NoteTone = 'info' | 'warning' | 'error' | 'ok';

const toneIcon: Record<NoteTone, IconName> = {
  info: 'info',
  warning: 'alert',
  error: 'x',
  ok: 'check',
};

interface NoteProps {
  tone: NoteTone;
  /** What happened and what to do, without apologizing. */
  children: ReactNode;
}

/**
 * A message in the flow, next to what it explains. Errors are announced as alerts; the rest are
 * read in order.
 */
export function Note({ tone, children }: NoteProps) {
  return (
    <div className={cx(styles.note, styles[tone])} {...(tone === 'error' ? { role: 'alert' } : {})}>
      <Icon name={toneIcon[tone]} size={20} />
      <span>{children}</span>
    </div>
  );
}

/** Brief confirmation of an action on ink: «Cobraste 36,96 Crédito». */
export function Toast({ children }: { children: ReactNode }) {
  return (
    <div className={styles.toast}>
      <Icon name="check" size={18} />
      <span>{children}</span>
    </div>
  );
}

/**
 * Live region that announces toasts. Keep it mounted; show at most 2 or 3 toasts and add up
 * repeated ones («+80 Crédito», not two of +40).
 */
export function ToastRegion({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div className={styles.region} role="status" aria-live="polite" aria-label={label}>
      {children}
    </div>
  );
}
