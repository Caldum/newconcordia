import type { HTMLAttributes, ReactNode } from 'react';

import { cx } from '../cx';

import styles from './Panel.module.css';

export type PanelSurface = 'land' | 'ink' | 'nation' | 'map';

interface PanelProps extends HTMLAttributes<HTMLElement> {
  /** Chosen by content, not taste: land everyday, ink decisions, nation the player's own, map the stage. */
  surface?: PanelSurface;
  as?: 'section' | 'div' | 'article' | 'aside';
}

export function Panel({
  surface = 'land',
  as: Element = 'section',
  className,
  ...rest
}: PanelProps) {
  return <Element className={cx(styles.panel, styles[surface], className)} {...rest} />;
}

interface PanelHeaderProps {
  title: ReactNode;
  /** Heading level that fits the page outline. */
  level?: 2 | 3;
  /** Status or action on the right. */
  action?: ReactNode;
}

export function PanelHeader({ title, level = 2, action }: PanelHeaderProps) {
  const Heading = level === 2 ? 'h2' : 'h3';
  return (
    <header className={styles.header}>
      <Heading className="at-title-2">{title}</Heading>
      {action}
    </header>
  );
}

export function PanelBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx(styles.body, className)} {...rest} />;
}
