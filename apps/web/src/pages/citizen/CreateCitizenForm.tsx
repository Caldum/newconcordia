import { Button } from '@concordia/atlas/Button';
import { Note } from '@concordia/atlas/Note';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useCallback, useRef, useState } from 'react';
import type { SubmitEvent } from 'react';

import { createMyCitizen } from '../../features/auth/api';
import styles from '../../features/auth/AuthForm.module.css';
import type { NameStatus } from '../../features/auth/citizenName';
import { CitizenNameField } from '../../features/auth/CitizenNameField';
import { CountryField } from '../../features/auth/CountryField';
import { useLocale, useMessages } from '../../i18n';

import { messages } from './messages';

export function CreateCitizenForm({ email, onCreated }: { email: string; onCreated: () => void }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [citizenName, setCitizenName] = useState('');
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [nameStatus, setNameStatus] = useState<NameStatus | 'unknown'>('unknown');
  const [forcedNameStatus, setForcedNameStatus] = useState<NameStatus | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState<'countryNotInPlay' | 'failed' | null>(null);
  const nameInput = useRef<HTMLInputElement>(null);

  const onNameStatus = useCallback((status: NameStatus | 'unknown') => {
    setNameStatus(status);
  }, []);

  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowErrors(true);
    setProblem(null);
    if (nameStatus === 'invalid' || nameStatus === 'taken' || citizenName.trim() === '') {
      nameInput.current?.focus();
      return;
    }
    if (!countryCode) return;
    setSending(true);
    const { error } = await createMyCitizen(citizenName.trim(), countryCode, locale);
    setSending(false);
    if (error) {
      if (error.message === 'citizen_name_taken' || error.message === 'citizen_name_invalid') {
        setForcedNameStatus(error.message === 'citizen_name_taken' ? 'taken' : 'invalid');
        nameInput.current?.focus();
      } else if (error.message === 'country_not_in_play') {
        setProblem('countryNotInPlay');
      } else {
        setProblem('failed');
      }
      return;
    }
    // Tell the page first, so the refreshed citizen does not trigger its «already has one» redirect.
    onCreated();
    await queryClient.invalidateQueries({ queryKey: ['me'] });
    await navigate({ to: '/citizenship', search: { welcome: true } });
  };

  return (
    <form className={styles.form} noValidate onSubmit={(event) => void submit(event)}>
      <div className={styles.heading}>
        <h1 className="at-title-1">{copy.title}</h1>
        <p>{copy.intro(email)}</p>
      </div>
      <CitizenNameField
        ref={nameInput}
        value={citizenName}
        onChange={(value) => {
          setCitizenName(value);
          setForcedNameStatus(null);
        }}
        onStatus={onNameStatus}
        showErrors={showErrors}
        forcedStatus={forcedNameStatus}
      />
      <CountryField value={countryCode} onChange={setCountryCode} showErrors={showErrors} />
      {problem ? <Note tone="error">{copy[problem]}</Note> : null}
      <Button type="submit" size="large" className={styles.submit} disabled={sending}>
        {sending ? copy.sending : copy.submit}
      </Button>
    </form>
  );
}
