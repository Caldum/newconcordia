import { Panel } from '@concordia/atlas/Panel';

import styles from '../../features/economy/economy.module.css';
import { ReportButton } from '../../features/moderation/ReportButton';
import { useConversation } from '../../features/society/queries';
import { formatDateTime, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';

/** The latest messages with one citizen, newest first. */
export function ConversationThread({ withName }: { withName: string }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const thread = useConversation(withName);
  const rows = thread.data ?? [];

  return (
    <Panel className={styles.panel} aria-labelledby="thread-title">
      <h2 id="thread-title" className="at-title-3">
        {copy.threadTitle(withName)}
      </h2>
      <ul className={styles.recipes}>
        {rows.map((m) => (
          <li key={m.message_id}>
            <span>
              <strong>{m.mine ? copy.you : withName}</strong>
              <br />
              {m.hidden ? (
                <span className={styles.muted}>{copy.hiddenMessage}</span>
              ) : (
                <span style={{ whiteSpace: 'pre-wrap' }}>{m.body}</span>
              )}
              {m.mine || m.hidden ? null : (
                <ReportButton
                  kind="message"
                  target={String(m.message_id)}
                  what={copy.reportWhat(withName)}
                />
              )}
            </span>
            <span className={styles.muted}>{formatDateTime(m.sent_at, locale)}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
