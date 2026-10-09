import { Button, buttonClassName } from '@concordia/atlas/Button';
import { Note } from '@concordia/atlas/Note';
import { Panel } from '@concordia/atlas/Panel';
import { useQueryClient } from '@tanstack/react-query';
import { Link, Navigate, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import { CountryField } from '../../features/auth/CountryField';
import type { Citizen } from '../../features/auth/useCitizen';
import { useCitizenshipRules, useMyCitizenshipRequest } from '../../features/citizenship/queries';
import { CitizenOnly, GameShell } from '../../features/shell/GameShell';
import { useWorld } from '../../features/world/useWorld';
import { defineMessages, formatDate, useLocale, useMessages } from '../../i18n';
import { supabase } from '../../lib/supabase';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { useNow } from '../../lib/useNow';

import styles from './CitizenshipPage.module.css';

const messages = defineMessages({
  es: {
    documentTitle: 'Cambiar de país · Concordia',
    title: 'Cambiar de país',
    intro:
      'Pide la ciudadanía de otro país. Según sus leyes, se aprueba automáticamente o la revisa su ministro del Interior.',
    choose: '¿A qué país?',
    today: (country: string) => `Hoy: ${country}`,
    rulesTitle: (country: string) => `Qué pide ${country}`,
    mode: 'Modo',
    automatic: 'Aprobación automática',
    review: 'Revisión del ministro del Interior',
    answer: 'Si nadie responde',
    answerValue: (hours: number) => `Se aprueba en ${String(hours)} h`,
    electionWait: 'Espera para votar en elecciones',
    days: (days: number) => `${String(days)} días`,
    sameCountry: (country: string) => `Ya tienes la ciudadanía de ${country}. Elige otro país.`,
    whatChanges: 'Qué cambia para ti',
    losesOffices: (country: string) => `Dejas los cargos que tengas en ${country}.`,
    keeps: 'Conservas tu nombre, tus pertenencias y tu progreso.',
    newNumber: 'Recibes un número de ciudadano nuevo y vives en la capital del país.',
    limit: 'Después de cambiar, tienes que esperar 30 días para volver a hacerlo.',
    submit: (country: string) => `Pedir la ciudadanía de ${country}`,
    submitGeneric: 'Pedir la ciudadanía',
    sending: 'Enviando…',
    sentTitle: 'Pedido enviado',
    sent: (country: string) =>
      `Tu pedido llegó a ${country}. Mientras tanto conservas tu ciudadanía actual con todos tus derechos. Si nadie responde en 72 horas, se aprueba automáticamente.`,
    approved: (country: string) => `Ya tienes la ciudadanía de ${country}.`,
    back: 'Volver a mi ciudadanía',
    pending: 'Ya tienes un pedido pendiente. Cancélalo antes de pedir otro.',
    tooSoon: (date: string) => `Puedes volver a cambiar de país desde el ${date}.`,
    failed: 'No se pudo enviar el pedido. Vuelve a intentar en unos minutos.',
    required: 'Elige el país al que quieres ir.',
  },
  en: {
    documentTitle: 'Change country · Concordia',
    title: 'Change country',
    intro:
      'Ask another country for citizenship. Depending on its laws, it is approved automatically or reviewed by its Interior minister.',
    choose: 'Which country?',
    today: (country: string) => `Today: ${country}`,
    rulesTitle: (country: string) => `What ${country} asks for`,
    mode: 'Mode',
    automatic: 'Automatic approval',
    review: 'Review by the Interior minister',
    answer: 'If nobody answers',
    answerValue: (hours: number) => `Approved after ${String(hours)} h`,
    electionWait: 'Wait to vote in elections',
    days: (days: number) => `${String(days)} days`,
    sameCountry: (country: string) =>
      `You are already a citizen of ${country}. Choose another country.`,
    whatChanges: 'What changes for you',
    losesOffices: (country: string) => `You leave any office you hold in ${country}.`,
    keeps: 'You keep your name, your belongings and your progress.',
    newNumber: 'You get a new citizen number and live in the country’s capital.',
    limit: 'After a change you have to wait 30 days to change again.',
    submit: (country: string) => `Ask for citizenship of ${country}`,
    submitGeneric: 'Ask for citizenship',
    sending: 'Sending…',
    sentTitle: 'Request sent',
    sent: (country: string) =>
      `Your request reached ${country}. Meanwhile you keep your current citizenship with all your rights. If nobody answers in 72 hours, it is approved automatically.`,
    approved: (country: string) => `You are now a citizen of ${country}.`,
    back: 'Back to my citizenship',
    pending: 'You already have a pending request. Cancel it before asking again.',
    tooSoon: (date: string) => `You can change country again from ${date}.`,
    failed: 'The request could not be sent. Try again in a few minutes.',
    required: 'Choose the country you want to move to.',
  },
});

function ChangeForm({ citizen }: { citizen: Citizen }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  useDocumentTitle(copy.documentTitle);
  const world = useWorld();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const request = useMyCitizenshipRequest();
  const [target, setTarget] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<'pending' | null>(null);
  const [problem, setProblem] = useState<'pending' | 'tooSoon' | 'failed' | null>(null);
  const rules = useCitizenshipRules(target && target !== citizen.country_code ? target : null);

  const nameOf = (code: string) => {
    const country = world.data?.countries.get(code);
    if (!country) return code;
    return locale === 'es' ? country.name_es : country.name_en;
  };
  const current = nameOf(citizen.country_code);
  const sameCountry = target === citizen.country_code;
  const now = useNow();
  const tooSoon = citizen.next_change_from !== null && now < Date.parse(citizen.next_change_from);

  if (request.data?.status === 'pending' && result === null) {
    return <Navigate to="/citizenship" replace />;
  }

  const submit = async () => {
    setShowErrors(true);
    setProblem(null);
    if (!target || sameCountry) return;
    setSending(true);
    const { data, error } = await supabase.rpc('request_citizenship', { p_country_code: target });
    setSending(false);
    if (error) {
      setProblem(
        error.message === 'request_pending'
          ? 'pending'
          : error.message === 'change_too_soon'
            ? 'tooSoon'
            : 'failed',
      );
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ['me'] });
    const status = (data as { status?: string }[] | null)?.[0]?.status;
    if (status === 'approved') {
      await navigate({ to: '/citizenship' });
      return;
    }
    setResult('pending');
  };

  if (result === 'pending' && target) {
    return (
      <main className={styles.page}>
        <div className={styles.intro} role="status">
          <h1 className="at-title-1">{copy.sentTitle}</h1>
          <p className="at-body-l">{copy.sent(nameOf(target))}</p>
          <Link to="/citizenship" className={buttonClassName({ variant: 'secondary' })}>
            {copy.back}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.intro}>
        <h1 className="at-title-1">{copy.title}</h1>
        <p className="at-body-l">{copy.intro}</p>
      </div>
      {tooSoon && citizen.next_change_from ? (
        <Note tone="info">{copy.tooSoon(formatDate(citizen.next_change_from, locale))}</Note>
      ) : (
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
            {target && !sameCountry && rules.data ? (
              <Panel className={styles.panel} aria-labelledby="rules-title">
                <h2 id="rules-title" className="at-title-3">
                  {copy.rulesTitle(nameOf(target))}
                </h2>
                <dl className={styles.facts}>
                  <dt>{copy.mode}</dt>
                  <dd>{rules.data.mode === 'automatic' ? copy.automatic : copy.review}</dd>
                  {rules.data.mode === 'review' ? (
                    <>
                      <dt>{copy.answer}</dt>
                      <dd>{copy.answerValue(rules.data.answer_hours)}</dd>
                    </>
                  ) : null}
                  <dt>{copy.electionWait}</dt>
                  <dd>{copy.days(rules.data.election_wait_days)}</dd>
                </dl>
              </Panel>
            ) : null}
            <Panel className={styles.panel} aria-labelledby="changes-title">
              <h2 id="changes-title" className="at-title-3">
                {copy.whatChanges}
              </h2>
              <ul className={styles.limits}>
                <li>{copy.losesOffices(current)}</li>
                <li>{copy.newNumber}</li>
                <li>{copy.keeps}</li>
                <li>{copy.limit}</li>
              </ul>
            </Panel>
            {problem ? (
              <Note tone="error">
                {problem === 'pending'
                  ? copy.pending
                  : problem === 'tooSoon' && citizen.next_change_from
                    ? copy.tooSoon(formatDate(citizen.next_change_from, locale))
                    : copy.failed}
              </Note>
            ) : null}
            <Button
              size="large"
              disabled={sending}
              onClick={() => {
                void submit();
              }}
            >
              {sending
                ? copy.sending
                : target && !sameCountry
                  ? copy.submit(nameOf(target))
                  : copy.submitGeneric}
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}

export function ChangeCitizenshipPage() {
  return (
    <GameShell>
      <CitizenOnly>{(citizen) => <ChangeForm citizen={citizen} />}</CitizenOnly>
    </GameShell>
  );
}
