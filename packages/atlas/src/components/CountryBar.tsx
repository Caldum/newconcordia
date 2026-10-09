import type { ReactNode } from 'react';

import styles from './CountryBar.module.css';

interface CountryBarProps {
  /** Usually a link to home wrapping a BrandMark with an accessible name. */
  brand: ReactNode;
  /** CountryBarNav with the sections. */
  navigation: ReactNode;
  /** Gold, Credit, energy, notices and profile. */
  resources: ReactNode;
}

/** The app's top bar, tinted with the player's country color (`--nation`). Not used on Entry. */
export function CountryBar({ brand, navigation, resources }: CountryBarProps) {
  return (
    <header className={styles.bar}>
      <div className={styles.start}>
        <span className={styles.brand}>{brand}</span>
        {navigation}
      </div>
      <div className={styles.resources}>{resources}</div>
    </header>
  );
}

interface CountryBarNavProps {
  label: string;
  /** Links (router links in the app); the current one carries `aria-current="page"`. */
  links: readonly ReactNode[];
}

export function CountryBarNav({ label, links }: CountryBarNavProps) {
  return (
    <nav aria-label={label} className={styles.nav}>
      <ul>
        {links.map((link, index) => (
          // Links are positional: their order is their identity.
          <li key={index}>{link}</li>
        ))}
      </ul>
    </nav>
  );
}

interface ResourceChipProps {
  icon?: ReactNode;
  /** Visible value, for example «1.240» or «38.450 Crédito». */
  children: ReactNode;
  /** Spoken label when the visible text needs context: «1.240 Oro». */
  label?: string;
}

/** A resource on land inside the bar. */
export function ResourceChip({ icon, children, label }: ResourceChipProps) {
  return (
    <span className={styles.resource} {...(label ? { role: 'group', 'aria-label': label } : {})}>
      {icon}
      {children}
    </span>
  );
}
