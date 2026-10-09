import type { ReactNode } from 'react';

import { cx } from '../cx';

import { Icon } from './Icon';
import type { IconName } from './Icon';
import styles from './Status.module.css';

export type StatusTone = 'neutral' | 'live' | 'ok' | 'warning' | 'info' | 'nation';

interface StatusProps {
  tone?: StatusTone;
  /** 14 px icon before the word. `live` already shows its dot. */
  icon?: IconName;
  /** A word that is understood without the color: «En vivo», «Aprobada». */
  children: ReactNode;
}

export function Status({ tone = 'neutral', icon, children }: StatusProps) {
  return (
    <span className={cx(styles.status, tone !== 'neutral' && styles[tone])}>
      {tone === 'live' ? <span className={styles.dot} aria-hidden="true" /> : null}
      {icon ? <Icon name={icon} size={14} /> : null}
      {children}
    </span>
  );
}
