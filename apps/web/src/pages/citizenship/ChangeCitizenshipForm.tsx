import { Button } from '@concordia/atlas/Button';
import { Note } from '@concordia/atlas/Note';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import { CountryField } from '../../features/auth/CountryField';
import { requestCitizenship } from '../../features/citizenship/api';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { useCountryName } from '../../features/world/useNames';
import { formatDate, useLocale, useMessages } from '../../i18n';

import styles from './CitizenshipPage.module.css';
import { CountryRulesPanel } from './CountryRulesPanel';
import { changeMessages as messages } from './messages';
import { WhatChangesPanel } from './WhatChangesPanel';

/** Choosing the new country, its rules, what changes, and sending the request. */
export function ChangeCitizenshipForm({ onSent }: { onSent: (countryCode: string) => void }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const citizen = useCurrentCitizen();
  const countryName = useCountryName();
  const navigate = useNavigate();
  const [target, setTarget] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const send = useGameAction((_, countryCode: string) => requestCitizenship(countryCode), {
    onSuccess: (rows, countryCode) => {
      // Automatic countries approve at once: back to the new document.
      if (rows?.[0]?.status === 'approved') void navigate({ to: '/citizenship' });
      else onSent(countryCode);
    },
  });
  const current = countryName(citizen.country_code);
  const sameCountry = target === citizen.country_code;
  const other = target !== null && !sameCountry ? target : null;
  const tooSoon = send.problem === 'change_too_soon' ? citizen.next_change_from : null;

  return (
    <div className={styles.layout}>
      <div className={styles.side}>
        <p className="at-support">{copy.today(current)}</p>
        <CountryField
          value={target}
          onChange={setTarget}
          showErrors={showErrors}
          title={copy.choose}
        />
        {sameCountry ? <Note tone="warning">{copy.sameCountry(current)}</Note> : null}
      </div>
      <div className={styles.side}>
        {other ? <CountryRulesPanel countryCode={other} /> : null}
        <WhatChangesPanel />
        {tooSoon ? (
          <Note tone="error">{copy.tooSoon(formatDate(tooSoon, locale))}</Note>
        ) : (
          <ActionFeedback problem={send.problem} copy={copy} />
        )}
        <Button
          size="large"
          disabled={send.pending}
          onClick={() => {
            setShowErrors(true);
            if (other) send.run(other);
          }}
        >
          {send.pending
            ? copy.sending
            : other
              ? copy.submit(countryName(other))
              : copy.submitGeneric}
        </Button>
      </div>
    </div>
  );
}
