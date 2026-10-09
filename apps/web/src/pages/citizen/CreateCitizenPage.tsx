import { Button } from '@concordia/atlas/Button';
import { Note } from '@concordia/atlas/Note';
import { useQueryClient } from '@tanstack/react-query';
import { Navigate, useNavigate } from '@tanstack/react-router';
import { useCallback, useRef, useState } from 'react';
import type { SubmitEvent } from 'react';

import styles from '../../features/auth/AuthForm.module.css';
import { AuthLayout } from '../../features/auth/AuthLayout';
import { useAuth } from '../../features/auth/AuthProvider';
import type { NameStatus } from '../../features/auth/citizenName';
import { CitizenNameField } from '../../features/auth/CitizenNameField';
import { CountryField } from '../../features/auth/CountryField';
import { Story } from '../../features/auth/Story';
import { useCitizen } from '../../features/auth/useCitizen';
import { defineMessages, useLocale, useMessages } from '../../i18n';
import { supabase } from '../../lib/supabase';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

const messages = defineMessages({
  es: {
    documentTitle: 'Crea tu ciudadano · Concordia',
    storyTitle: 'Te falta un paso.',
    storyBody: 'Elige el nombre de tu ciudadano y el país donde empiezas.',
    title: 'Crea tu ciudadano',
    intro: (email: string) => `Entraste como ${email}.`,
    submit: 'Crear mi ciudadano',
    sending: 'Creando tu ciudadano…',
    countryNotInPlay: 'Ese país no está en juego. Elige otro de la lista.',
    failed: 'No pudimos crear tu ciudadano. Vuelve a intentar en unos minutos.',
  },
  en: {
    documentTitle: 'Create your citizen · Concordia',
    storyTitle: 'One step left.',
    storyBody: 'Choose your citizen’s name and the country where you start.',
    title: 'Create your citizen',
    intro: (email: string) => `You signed in as ${email}.`,
    submit: 'Create my citizen',
    sending: 'Creating your citizen…',
    countryNotInPlay: 'That country is not in play. Choose another one from the list.',
    failed: 'We could not create your citizen. Try again in a few minutes.',
  },
});

function CreateCitizenForm({ email }: { email: string }) {
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
    const { error } = await supabase.rpc('create_my_citizen', {
      p_name: citizenName.trim(),
      p_country_code: countryCode,
      p_locale: locale,
    });
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
    await queryClient.invalidateQueries({ queryKey: ['me'] });
    await navigate({ to: '/' });
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

/** Accounts created with Google choose their citizen here once. */
export function CreateCitizenPage() {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);
  const auth = useAuth();
  const citizen = useCitizen();

  if (auth.status === 'signedOut') return <Navigate to="/sign-in" replace />;
  if (auth.status === 'loading' || citizen.isPending) return null;
  if (citizen.data) return <Navigate to="/" replace />;

  return (
    <AuthLayout story={<Story title={copy.storyTitle}>{copy.storyBody}</Story>}>
      <CreateCitizenForm email={auth.session.user.email ?? ''} />
    </AuthLayout>
  );
}
