import { useSearch } from '@tanstack/react-router';

import { useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import { AdaptationNotice } from './AdaptationNotice';
import { CitizenDocument } from './CitizenDocument';
import { CitizenshipChangePanel } from './CitizenshipChangePanel';
import { CitizenshipIntro } from './CitizenshipIntro';
import styles from './CitizenshipPage.module.css';
import { messages } from './messages';
import { WaitlistPanel } from './WaitlistPanel';

/** `/citizenship`: the document, the first days, the waitlist and changing country. */
export function CitizenshipPage() {
  const copy = useMessages(messages);
  const welcome = useSearch({ from: '/game/citizenship' }).welcome === true;
  useDocumentTitle(welcome ? copy.welcomeDocumentTitle : copy.documentTitle);
  return (
    <main className={styles.page}>
      <CitizenshipIntro welcome={welcome} />
      <div className={styles.layout}>
        <CitizenDocument animate={welcome} />
        <div className={styles.side}>
          <AdaptationNotice />
          <WaitlistPanel />
          <CitizenshipChangePanel />
        </div>
      </div>
    </main>
  );
}
