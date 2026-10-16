import { Brand } from '@concordia/atlas/Brand';
import { Button } from '@concordia/atlas/Button';
import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { LanguageSwitch, useMessages } from '../../i18n';
import { signOut } from '../auth/api';

import { AdminNav } from './AdminNav';
import styles from './AdminShell.module.css';
import { useCurrentStaff } from './CurrentStaff';
import { consoleMessages } from './messages';

/** The console's frame (Admin canvas): its own dark bar, apart from the game, and the page. */
export function AdminShell({ children }: { children: ReactNode }) {
  const copy = useMessages(consoleMessages);
  const staff = useCurrentStaff();
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/admin" aria-label={copy.homeLabel} className={styles.brand}>
          <Brand size={30} />
        </Link>
        <span className={styles.tag}>{copy.tag}</span>
        <AdminNav />
        <div className={styles.tools}>
          <span className={styles.who}>
            {staff.email} · {copy[`role_${staff.role}`]}
          </span>
          <LanguageSwitch />
          <Button
            variant="outline-light"
            icon="logout"
            onClick={() => {
              void signOut();
            }}
          >
            {copy.signOut}
          </Button>
        </div>
      </header>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
