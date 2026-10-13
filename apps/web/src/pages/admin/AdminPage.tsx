import { Note } from '@concordia/atlas/Note';

import { useIsAdmin } from '../../features/admin/queries';
import { useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import styles from './AdminPage.module.css';
import { AdminPanel } from './AdminPanel';
import { messages } from './messages';

/** `/admin`: countries, regions, the action log and the team, for admins only. */
export function AdminPage() {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);
  const isAdmin = useIsAdmin();
  return (
    <main className={styles.page}>
      <div>
        <p className={styles.eyebrow}>{copy.eyebrow}</p>
        <h1 className="at-title-1">{copy.title}</h1>
      </div>
      {isAdmin.isPending ? null : isAdmin.data ? (
        <AdminPanel />
      ) : (
        <Note tone="info">{copy.notAdmin}</Note>
      )}
    </main>
  );
}
