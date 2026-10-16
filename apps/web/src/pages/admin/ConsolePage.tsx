import type { ReactNode } from 'react';

import { consoleMessages } from '../../features/admin/messages';
import { useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import styles from './AdminPage.module.css';

interface ConsolePageProps {
  title: string;
  intro?: string;
  /** Beside the title, such as a search box or a filter. */
  aside?: ReactNode;
  children: ReactNode;
}

/** A console page: its title (also the document's), what it is for, and its sections. */
export function ConsolePage({ title, intro, aside, children }: ConsolePageProps) {
  const copy = useMessages(consoleMessages);
  useDocumentTitle(`${title} · ${copy.tag} · Concordia`);
  return (
    <main className={styles.page}>
      <div className={styles.head}>
        <div>
          <h1 className="at-title-1">{title}</h1>
          {intro ? <p>{intro}</p> : null}
        </div>
        {aside}
      </div>
      {children}
    </main>
  );
}
