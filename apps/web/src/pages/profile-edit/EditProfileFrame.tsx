import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import profileStyles from '../profile/ProfilePage.module.css';
import { ProfileTabs } from '../profile/ProfileTabs';

import styles from './EditProfile.module.css';
import { messages } from './messages';

const current = {
  activeProps: { 'aria-current': 'page' as const },
  activeOptions: { exact: true },
};

/** Editing the profile: its two parts, Information and Settings and security. */
export function EditProfileFrame({ children }: { children: ReactNode }) {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);
  return (
    <main className={profileStyles.main}>
      <ProfileTabs />
      <h1 className="at-title-1">{copy.title}</h1>
      <nav aria-label={copy.sections} className={styles.parts}>
        <Link to="/profile/edit" {...current}>
          {copy.information}
        </Link>
        <Link to="/profile/edit/security" {...current}>
          {copy.security}
        </Link>
      </nav>
      <div className={styles.panels}>{children}</div>
    </main>
  );
}
