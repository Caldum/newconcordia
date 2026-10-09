import type { HTMLAttributes } from 'react';

import { cx } from '../cx';

import styles from './Stage.module.css';

/** The 13 national colors, in Atlas order. */
const countryColors = [
  'arg',
  'bra',
  'chl',
  'pry',
  'mex',
  'usa',
  'can',
  'esp',
  'prt',
  'fra',
  'ita',
  'deu',
  'gbr',
] as const;

/** The 6 px band of the 13 national colors that closes stages and color bands. */
export function CountryStripe({ className }: { className?: string }) {
  return (
    <span className={cx(styles.stripe, className)} aria-hidden="true">
      {countryColors.map((code) => (
        <span key={code} style={{ background: `var(--country-${code})` }} />
      ))}
    </span>
  );
}

interface StageProps extends HTMLAttributes<HTMLElement> {
  stripe?: boolean;
}

/** Dark surface that always shows something from the game in progress, never a generic picture. */
export function Stage({ stripe = true, className, children, ...rest }: StageProps) {
  return (
    <section className={cx(styles.stage, stripe && styles.withStripe, className)} {...rest}>
      {children}
      {stripe ? <CountryStripe /> : null}
    </section>
  );
}
