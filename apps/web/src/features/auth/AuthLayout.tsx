import { BrandMark } from '@concordia/atlas/Brand';
import { Icon } from '@concordia/atlas/Icon';
import { CountryStripe } from '@concordia/atlas/Stage';
import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { useMessages } from '../../i18n';

import styles from './AuthLayout.module.css';
import { authMessages } from './messages';

interface AuthLayoutProps {
  /** What the game shows on the dark side: never a stock picture. */
  story: ReactNode;
  children: ReactNode;
}

/** Account screens: the game on the left, the form on the right (stacked on narrow screens). */
export function AuthLayout({ story, children }: AuthLayoutProps) {
  const copy = useMessages(authMessages);
  return (
    <div className={styles.layout}>
      <aside className={styles.aside}>
        <div className={styles.top}>
          <Link to="/" className={styles.homeLink} aria-label={copy.homeLabel}>
            <BrandMark version="markOnInk" size={34} />
          </Link>
          <Link to="/" className={styles.back}>
            <Icon name="back" size={18} />
            {copy.backHome}
          </Link>
        </div>
        <div className={styles.story}>{story}</div>
        <span />
        <CountryStripe />
      </aside>
      <main className={styles.main}>
        <div className={styles.content}>{children}</div>
      </main>
    </div>
  );
}
