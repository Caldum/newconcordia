import { Button } from '@concordia/atlas/Button';
import { Panel } from '@concordia/atlas/Panel';
import { Link } from '@tanstack/react-router';

import { useMessages } from '../../i18n';
import { signOut } from '../auth/api';

import styles from './AdminShell.module.css';
import { consoleMessages } from './messages';

/** A player's account reached the console: it is not a staff account. */
export function NotStaff() {
  const copy = useMessages(consoleMessages);
  return (
    <main className={styles.alone}>
      <Panel className={styles.card} aria-labelledby="not-staff-title">
        <h1 id="not-staff-title" className="at-title-2">
          {copy.notStaffTitle}
        </h1>
        <p>{copy.notStaffBody}</p>
        <div className={styles.cardActions}>
          <Button
            variant="secondary"
            icon="logout"
            onClick={() => {
              void signOut();
            }}
          >
            {copy.signOut}
          </Button>
          <Link to="/">{copy.toGame}</Link>
        </div>
      </Panel>
    </main>
  );
}
