import { Button } from '@concordia/atlas/Button';
import { Note } from '@concordia/atlas/Note';
import { Panel } from '@concordia/atlas/Panel';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { markNotificationsSeen } from '../../features/notifications/api';
import { useNotifications } from '../../features/notifications/queries';
import { formatDateTime, useLocale, useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import { messages } from './messages';
import { useNotificationText } from './useNotificationText';

/** `/notifications`: the player's and their country's latest events. */
export function NotificationsPage() {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);
  const { locale } = useLocale();
  const notifications = useNotifications();
  const text = useNotificationText();
  const mark = useGameAction(() => markNotificationsSeen());
  const rows = notifications.data ?? [];

  return (
    <main className={styles.page}>
      <div className={styles.intro}>
        <h1 className="at-title-1">{copy.title}</h1>
        <p className="at-body-l">{copy.intro}</p>
      </div>
      {notifications.isError ? <Note tone="error">{copy.loadFailed}</Note> : null}
      <Panel className={styles.panel} aria-labelledby="notices-title">
        <div className={styles.panelHead}>
          <h2 id="notices-title" className="at-title-3">
            {copy.title}
          </h2>
          <Button
            variant="secondary"
            disabled={mark.pending || !rows.some((n) => n.unread)}
            onClick={() => {
              mark.run();
            }}
          >
            {copy.markSeen}
          </Button>
        </div>
        <ActionFeedback
          problem={mark.problem}
          copy={copy}
          success={mark.succeeded ? copy.marked : null}
        />
        {notifications.isSuccess && rows.length === 0 ? (
          <p className={styles.muted}>{copy.none}</p>
        ) : null}
        <ul className={styles.recipes}>
          {rows.map((n) => (
            <li key={n.notification_id}>
              <span>
                {n.unread && !mark.succeeded ? <strong>{copy.unread} · </strong> : null}
                {text(n)}
              </span>
              <span className={styles.muted}>{formatDateTime(n.created_at, locale)}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </main>
  );
}
