import { Button } from '@concordia/atlas/Button';
import { Panel } from '@concordia/atlas/Panel';
import { useState } from 'react';

import styles from '../../features/economy/economy.module.css';
import { useConversations } from '../../features/society/queries';
import { SocietyTabs } from '../../features/society/SocietyTabs';
import { useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import { ComposeForm } from './ComposeForm';
import { ConversationThread } from './ConversationThread';
import { messages } from './messages';

/** `/messages`: conversations, the open thread, and writing to someone. */
export function MessagesPage() {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);
  const conversations = useConversations();
  const rows = conversations.data ?? [];
  const [open, setOpen] = useState<string | null>(null);

  return (
    <main className={styles.page}>
      <SocietyTabs />
      <div className={styles.intro}>
        <h1 className="at-title-1">{copy.title}</h1>
        <p className="at-body-l">{copy.intro}</p>
      </div>
      <div className={styles.layout}>
        <div className={styles.column}>
          <Panel className={styles.panel} aria-labelledby="conversations-title">
            <h2 id="conversations-title" className="at-title-3">
              {copy.conversationsTitle}
            </h2>
            {conversations.isSuccess && rows.length === 0 ? (
              <p className={styles.muted}>{copy.none}</p>
            ) : null}
            <ul className={styles.recipes}>
              {rows.map((c) => (
                <li key={c.other_name}>
                  <span>
                    <strong>{c.other_name}</strong>
                    {c.unread > 0 ? ` · ${copy.unread(c.unread)}` : null}
                    <br />
                    <span className={styles.muted}>{c.last_body}</span>
                  </span>
                  <Button
                    variant="secondary"
                    aria-label={copy.open(c.other_name)}
                    onClick={() => {
                      setOpen(c.other_name);
                    }}
                  >
                    {copy.threadTitle(c.other_name)}
                  </Button>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
        <div className={styles.column}>
          {open ? <ConversationThread withName={open} /> : null}
          <ComposeForm to={open} />
        </div>
      </div>
    </main>
  );
}
