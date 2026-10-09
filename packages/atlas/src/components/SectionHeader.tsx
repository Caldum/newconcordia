import banks from '../assets/illustrations/banks.svg';
import economy from '../assets/illustrations/economy.svg';
import market from '../assets/illustrations/market.svg';
import politics from '../assets/illustrations/politics.svg';
import press from '../assets/illustrations/press.svg';
import resources from '../assets/illustrations/resources.svg';
import war from '../assets/illustrations/war.svg';
import { cx } from '../cx';

import styles from './SectionHeader.module.css';

const plates = { banks, economy, market, politics, press, resources, war };

export type SectionIllustration = keyof typeof plates;

interface SectionHeaderProps {
  /** Screen title (the page's h1). */
  title: string;
  /** The section's main rule, without a sales tone. */
  subtitle: string;
  illustration: SectionIllustration;
}

/**
 * Opens a game section with its plate, the only illustration on the screen. Not used on Home,
 * Entry or single-action screens.
 */
export function SectionHeader({ title, subtitle, illustration }: SectionHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.text}>
        <h1 className={cx('at-title-1', styles.title)}>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>
      </div>
      <div className={styles.plate}>
        <img src={plates[illustration]} alt="" width={640} height={360} decoding="async" />
      </div>
    </header>
  );
}
