import { Button } from '@concordia/atlas/Button';
import { Note } from '@concordia/atlas/Note';
import { Panel } from '@concordia/atlas/Panel';
import { useQueryClient } from '@tanstack/react-query';
import { Navigate } from '@tanstack/react-router';
import { useState } from 'react';

import type { Citizen } from '../../features/auth/useCitizen';
import { useRequestsToReview } from '../../features/citizenship/queries';
import { CitizenOnly, GameShell } from '../../features/shell/GameShell';
import { useWorld } from '../../features/world/useWorld';
import { defineMessages, formatDateTime, useLocale, useMessages } from '../../i18n';
import { supabase } from '../../lib/supabase';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import styles from './CitizenshipPage.module.css';

const messages = defineMessages({
  es: {
    documentTitle: 'Pedidos de ciudadanía · Concordia',
    title: 'Pedidos de ciudadanía',
    intro: (country: string) =>
      `Solo ven esta pantalla el presidente y el ministro del Interior de ${country}. Cada jugador es ciudadano de su país desde que se registra; aquí llegan los pedidos de quienes quieren cambiarse a ${country}.`,
    none: 'No hay pedidos pendientes.',
    from: (country: string, days: number) =>
      `Viene de ${country}, cuenta de ${String(days)} ${days === 1 ? 'día' : 'días'}.`,
    answerBy: (date: string) => `Si nadie responde, se aprueba el ${date}.`,
    approve: 'Aprobar',
    reject: 'Rechazar',
    approveLabel: (name: string) => `Aprobar el pedido de ${name}`,
    rejectLabel: (name: string) => `Rechazar el pedido de ${name}`,
    approved: (name: string) => `Aprobaste el pedido de ${name}.`,
    rejected: (name: string) => `Rechazaste el pedido de ${name}.`,
    failed: 'No se pudo registrar tu decisión. El pedido puede haberse resuelto ya.',
  },
  en: {
    documentTitle: 'Citizenship requests · Concordia',
    title: 'Citizenship requests',
    intro: (country: string) =>
      `Only the president and the Interior minister of ${country} see this screen. Every player is a citizen of their country from sign-up; here arrive the requests of those who want to move to ${country}.`,
    none: 'There are no pending requests.',
    from: (country: string, days: number) =>
      `Comes from ${country}, account ${String(days)} ${days === 1 ? 'day' : 'days'} old.`,
    answerBy: (date: string) => `If nobody answers, it is approved on ${date}.`,
    approve: 'Approve',
    reject: 'Reject',
    approveLabel: (name: string) => `Approve the request of ${name}`,
    rejectLabel: (name: string) => `Reject the request of ${name}`,
    approved: (name: string) => `You approved the request of ${name}.`,
    rejected: (name: string) => `You rejected the request of ${name}.`,
    failed: 'Your decision could not be saved. The request may have been decided already.',
  },
});

function Requests({ citizen }: { citizen: Citizen }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  useDocumentTitle(copy.documentTitle);
  const world = useWorld();
  const queryClient = useQueryClient();
  const requests = useRequestsToReview();
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  if (!citizen.reviews_citizenship) return <Navigate to="/citizenship" replace />;

  const nameOf = (code: string) => {
    const country = world.data?.countries.get(code);
    if (!country) return code;
    return locale === 'es' ? country.name_es : country.name_en;
  };

  const decide = async (requestId: number, name: string, approve: boolean) => {
    const { error } = await supabase.rpc('decide_citizenship_request', {
      p_request_id: requestId,
      p_approve: approve,
    });
    setNotice(
      error
        ? { ok: false, text: copy.failed }
        : { ok: true, text: approve ? copy.approved(name) : copy.rejected(name) },
    );
    await queryClient.invalidateQueries({ queryKey: ['me'] });
  };

  return (
    <main className={styles.page}>
      <div className={styles.intro}>
        <h1 className="at-title-1">{copy.title}</h1>
        <p className="at-body-l">{copy.intro(nameOf(citizen.country_code))}</p>
      </div>
      <div role="status">{notice?.ok ? <Note tone="ok">{notice.text}</Note> : null}</div>
      {notice && !notice.ok ? <Note tone="error">{notice.text}</Note> : null}
      {requests.data?.length === 0 ? <p>{copy.none}</p> : null}
      <ul className={styles.requests}>
        {requests.data?.map((request) => (
          <li key={request.request_id}>
            <Panel className={styles.request} aria-label={request.citizen_name}>
              <div>
                <h3 className="at-title-3">{request.citizen_name}</h3>
                <p>{copy.from(nameOf(request.from_country_code), request.account_age_days)}</p>
                <p>{copy.answerBy(formatDateTime(request.answer_by, locale))}</p>
              </div>
              <div className={styles.requestActions}>
                <Button
                  aria-label={copy.approveLabel(request.citizen_name)}
                  onClick={() => void decide(request.request_id, request.citizen_name, true)}
                >
                  {copy.approve}
                </Button>
                <Button
                  variant="secondary"
                  aria-label={copy.rejectLabel(request.citizen_name)}
                  onClick={() => void decide(request.request_id, request.citizen_name, false)}
                >
                  {copy.reject}
                </Button>
              </div>
            </Panel>
          </li>
        ))}
      </ul>
    </main>
  );
}

/** For the president and the Interior minister: requests to join their country. */
export function CitizenshipRequestsPage() {
  return (
    <GameShell>
      <CitizenOnly>{(citizen) => <Requests citizen={citizen} />}</CitizenOnly>
    </GameShell>
  );
}
