import { Button, buttonClassName } from '@concordia/atlas/Button';
import { Document } from '@concordia/atlas/Document';
import { Flag, hasFlag } from '@concordia/atlas/Flag';
import { Note } from '@concordia/atlas/Note';
import { Panel } from '@concordia/atlas/Panel';
import { Status } from '@concordia/atlas/Status';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useSearch } from '@tanstack/react-router';
import { useState } from 'react';

import type { Citizen } from '../../features/auth/useCitizen';
import { useMyCitizenshipRequest, useMyWaitlist } from '../../features/citizenship/queries';
import { CitizenOnly, GameShell } from '../../features/shell/GameShell';
import { useWorld } from '../../features/world/useWorld';
import { formatDate, formatDateTime, useLocale, useMessages } from '../../i18n';
import { supabase } from '../../lib/supabase';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { useNow } from '../../lib/useNow';

import styles from './CitizenshipPage.module.css';
import { messages } from './messages';

const dayMs = 24 * 60 * 60 * 1000;

function useNames() {
  const { locale } = useLocale();
  const world = useWorld();
  return {
    country: (code: string) => {
      const country = world.data?.countries.get(code);
      if (!country) return code;
      return locale === 'es' ? country.name_es : country.name_en;
    },
    official: (code: string) => {
      const country = world.data?.countries.get(code);
      const official = locale === 'es' ? country?.official_name_es : country?.official_name_en;
      return official ?? code;
    },
    region: (code: string) => world.data?.regions.get(code)?.name ?? code,
  };
}

function Citizenship({ citizen, welcome }: { citizen: Citizen; welcome: boolean }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  useDocumentTitle(welcome ? copy.welcomeDocumentTitle : copy.documentTitle);
  const names = useNames();
  const queryClient = useQueryClient();
  const waitlist = useMyWaitlist();
  const request = useMyCitizenshipRequest();
  const [failed, setFailed] = useState(false);

  const now = useNow();
  const adapting = now < Date.parse(citizen.adaptation_ends_at);
  const day = Math.min(7, Math.floor((now - Date.parse(citizen.joined_at)) / dayMs) + 1);
  const votesLater = now < Date.parse(citizen.votes_in_elections_from);
  const changeLater = citizen.next_change_from && now < Date.parse(citizen.next_change_from);
  const country = names.country(citizen.country_code);
  const region = names.region(citizen.region_code);
  const latest = request.data;

  const act = async (call: PromiseLike<{ error: unknown }>) => {
    setFailed(false);
    const { error } = await call;
    if (error) setFailed(true);
    await queryClient.invalidateQueries({ queryKey: ['me'] });
  };

  return (
    <main className={styles.page}>
      <div className={styles.intro}>
        {welcome ? (
          <>
            <h1 className="at-title-1">{copy.welcome(country, citizen.name)}</h1>
            <p className="at-body-l">{copy.welcomeBody(country, region)}</p>
            <Link to="/" className={buttonClassName({ size: 'large' })}>
              {copy.enter}
            </Link>
          </>
        ) : (
          <h1 className="at-title-1">{copy.title}</h1>
        )}
      </div>

      <div className={styles.layout}>
        <Document
          heading={copy.documentHeading}
          country={names.official(citizen.country_code)}
          animate={welcome}
          silhouette={
            hasFlag(citizen.country_code) ? (
              <span role="img" aria-label={copy.flagOf(country)}>
                <Flag code={citizen.country_code} width={96} />
              </span>
            ) : null
          }
          fields={[
            { label: copy.name, value: citizen.name, kind: 'name' },
            { label: copy.number, value: citizen.citizen_code, kind: 'number' },
            { label: copy.region, value: region, kind: 'place' },
            { label: copy.since, value: formatDate(citizen.citizen_since, locale) },
          ]}
        />

        <div className={styles.side}>
          {adapting ? (
            <Panel className={styles.panel} aria-labelledby="adaptation-title">
              <div className={styles.panelHead}>
                <h2 id="adaptation-title" className="at-title-3">
                  {copy.adaptationTitle}
                </h2>
                <Status tone="nation">{copy.adaptationDay(day)}</Status>
              </div>
              <p>{copy.adaptationIntro(formatDate(citizen.adaptation_ends_at, locale))}</p>
              <ul className={styles.limits}>
                <li>
                  <strong>{copy.halfDamage}</strong>
                  <span>{copy.halfDamageBody}</span>
                </li>
                <li>
                  <strong>{copy.noVote}</strong>
                  <span>{copy.noVoteBody}</span>
                </li>
              </ul>
            </Panel>
          ) : votesLater ? (
            <Note tone="info">
              {copy.votesFrom(formatDate(citizen.votes_in_elections_from, locale))}
            </Note>
          ) : null}

          {waitlist.data ? (
            <Panel className={styles.panel} aria-labelledby="waitlist-title">
              <h2 id="waitlist-title" className="at-title-3">
                {copy.waitlistTitle}
              </h2>
              <p>
                {copy.waitlistBody(names.country(waitlist.data.country_code), waitlist.data.place)}
              </p>
              <div>
                <Button
                  variant="secondary"
                  onClick={() => void act(supabase.rpc('leave_waitlist'))}
                >
                  {copy.leaveWaitlist}
                </Button>
              </div>
            </Panel>
          ) : null}

          <Panel className={styles.panel} aria-labelledby="change-title">
            <h2 id="change-title" className="at-title-3">
              {copy.requestTitle}
            </h2>
            {latest?.status === 'pending' ? (
              <>
                <p>
                  {copy.requestPending(
                    names.country(latest.to_country_code),
                    formatDateTime(latest.answer_by, locale),
                  )}
                </p>
                <div>
                  <Button
                    variant="secondary"
                    onClick={() => void act(supabase.rpc('cancel_citizenship_request'))}
                  >
                    {copy.cancelRequest}
                  </Button>
                </div>
              </>
            ) : (
              <>
                {latest?.status === 'rejected' ? (
                  <Note tone="warning">
                    {copy.requestRejected(names.country(latest.to_country_code))}
                  </Note>
                ) : null}
                {changeLater && citizen.next_change_from ? (
                  <p>{copy.nextChange(formatDate(citizen.next_change_from, locale))}</p>
                ) : (
                  <div>
                    <Link
                      to="/citizenship/change"
                      className={buttonClassName({ variant: 'secondary' })}
                    >
                      {copy.change}
                    </Link>
                  </div>
                )}
              </>
            )}
            {citizen.reviews_citizenship ? (
              <div>
                <Link to="/citizenship/requests" className={buttonClassName({ variant: 'ghost' })}>
                  {copy.reviewRequests}
                </Link>
              </div>
            ) : null}
          </Panel>
          {failed ? <Note tone="error">{copy.actionFailed}</Note> : null}
        </div>
      </div>
    </main>
  );
}

/** The player's citizenship: document, first days, waitlist and change of country. */
export function CitizenshipPage() {
  const search = useSearch({ from: '/citizenship' });
  return (
    <GameShell>
      <CitizenOnly>
        {(citizen) => <Citizenship citizen={citizen} welcome={search.welcome === true} />}
      </CitizenOnly>
    </GameShell>
  );
}
