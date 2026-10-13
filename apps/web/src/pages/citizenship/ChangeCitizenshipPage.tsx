import { Note } from '@concordia/atlas/Note';
import { Navigate } from '@tanstack/react-router';
import { useState } from 'react';

import { useMyCitizenshipRequest } from '../../features/citizenship/queries';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { formatDate, useLocale, useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { useNow } from '../../lib/useNow';

import { ChangeCitizenshipForm } from './ChangeCitizenshipForm';
import styles from './CitizenshipPage.module.css';
import { changeMessages as messages } from './messages';
import { RequestSent } from './RequestSent';

/** `/citizenship/change`: asking for another country's citizenship, at most every 30 days. */
export function ChangeCitizenshipPage() {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);
  const { locale } = useLocale();
  const citizen = useCurrentCitizen();
  const request = useMyCitizenshipRequest();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const now = useNow();
  const nextChange = citizen.next_change_from;

  // One request at a time: a pending one is managed from the citizenship screen.
  if (request.data?.status === 'pending' && sentTo === null) {
    return <Navigate to="/citizenship" replace />;
  }
  if (sentTo !== null) return <RequestSent countryCode={sentTo} />;

  return (
    <main className={styles.page}>
      <div className={styles.intro}>
        <h1 className="at-title-1">{copy.title}</h1>
        <p className="at-body-l">{copy.intro}</p>
      </div>
      {nextChange !== null && now < Date.parse(nextChange) ? (
        <Note tone="info">{copy.tooSoon(formatDate(nextChange, locale))}</Note>
      ) : (
        <ChangeCitizenshipForm onSent={setSentTo} />
      )}
    </main>
  );
}
