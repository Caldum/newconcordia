import { Note } from '@concordia/atlas/Note';
import { Panel } from '@concordia/atlas/Panel';
import { Switch } from '@concordia/atlas/Segmented';
import { useQueryClient } from '@tanstack/react-query';
import { useId, useState } from 'react';

import {
  useAdminCountries,
  useAdminLog,
  useAdminRegions,
  useAdminTeam,
  useIsAdmin,
} from '../../features/admin/queries';
import type { AdminLogEntry } from '../../features/admin/queries';
import { CitizenOnly, GameShell } from '../../features/shell/GameShell';
import { formatDate, formatDateTime, useLocale, useMessages } from '../../i18n';
import { supabase } from '../../lib/supabase';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import styles from './AdminPage.module.css';
import { actionNames, messages } from './messages';

/** A game day (YYYY-MM-DD) as a date on game time. */
function dayToDate(day: string): string {
  return `${day}T12:00:00Z`;
}

/** Renders a logged state ({"is_active": false, "apply_on": "2026-10-10"}) in words. */
function describeState(
  state: AdminLogEntry['before'],
  copy: { on: string; off: string },
  locale: 'es' | 'en',
): string {
  if (!state) return '—';
  const parts: string[] = [];
  for (const [key, value] of Object.entries(state)) {
    if (typeof value === 'boolean') parts.push(value ? copy.on : copy.off);
    else if (key === 'apply_on' && typeof value === 'string') {
      parts.push(formatDate(dayToDate(value), locale));
    }
  }
  return parts.join(', ') || '—';
}

function AdminPanel() {
  const copy = useMessages(messages);
  const actions = useMessages(actionNames);
  const { locale } = useLocale();
  const queryClient = useQueryClient();
  const filterId = useId();
  const [regionFilter, setRegionFilter] = useState('');
  const [notice, setNotice] = useState<'scheduled' | 'actionFailed' | null>(null);
  const countries = useAdminCountries(true);
  const regions = useAdminRegions(true);
  const log = useAdminLog(true);
  const team = useAdminTeam(true);

  if (countries.isError || regions.isError) return <Note tone="error">{copy.loadFailed}</Note>;

  const nameOf = (code: string) => {
    const country = countries.data?.find((item) => item.code === code);
    if (!country) return code;
    return locale === 'es' ? country.name_es : country.name_en;
  };

  const schedule = async (call: PromiseLike<{ error: unknown }>) => {
    setNotice(null);
    const { error } = await call;
    setNotice(error ? 'actionFailed' : 'scheduled');
    await queryClient.invalidateQueries({ queryKey: ['me'] });
  };

  const scheduledText = (enable: boolean | null, applyOn: string | null) =>
    enable === null || applyOn === null
      ? null
      : copy.scheduledOn(
          enable ? copy.turnsOn : copy.turnsOff,
          formatDate(dayToDate(applyOn), locale),
        );

  const withRegions = countries.data?.filter((country) => country.regions > 0) ?? [];
  const shownRegions =
    regions.data?.filter((region) => !regionFilter || region.home_country_code === regionFilter) ??
    [];

  return (
    <>
      <div role="status" className={styles.notice}>
        {notice === 'scheduled' ? <Note tone="ok">{copy.scheduled}</Note> : null}
      </div>
      {notice === 'actionFailed' ? <Note tone="error">{copy.actionFailed}</Note> : null}

      <Panel className={styles.section} aria-labelledby="countries-title">
        <div className={styles.sectionHead}>
          <div>
            <h2 id="countries-title" className="at-title-2">
              {copy.countriesTitle}
            </h2>
            <p>{copy.countriesIntro}</p>
          </div>
          <p className={styles.count}>
            {copy.inPlayCount(
              withRegions.filter((country) => country.is_active).length,
              withRegions.length,
            )}
          </p>
        </div>
        <Note tone="info">{copy.appliesAt}</Note>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className="at-visually-hidden">{copy.countriesTitle}</caption>
            <thead>
              <tr>
                <th scope="col">{copy.country}</th>
                <th scope="col">{copy.regions}</th>
                <th scope="col">{copy.citizens}</th>
                <th scope="col">{copy.waiting}</th>
                <th scope="col">{copy.inPlay}</th>
              </tr>
            </thead>
            <tbody>
              {countries.data?.map((country) => {
                const name = locale === 'es' ? country.name_es : country.name_en;
                const pending = scheduledText(country.scheduled, country.apply_on);
                return (
                  <tr key={country.code}>
                    <th scope="row">{name}</th>
                    <td>{country.regions}</td>
                    <td>{country.citizens}</td>
                    <td>{country.waiting}</td>
                    <td>
                      <div className={styles.switchCell}>
                        <Switch
                          label={copy.countrySwitch(name)}
                          checked={country.scheduled ?? country.is_active}
                          onChange={(next) => {
                            void schedule(
                              supabase.rpc('admin_schedule_country', {
                                p_country_code: country.code,
                                p_active: next,
                              }),
                            );
                          }}
                        />
                        {pending ? <span className={styles.pending}>{pending}</span> : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className={styles.section} aria-labelledby="regions-title">
        <div>
          <h2 id="regions-title" className="at-title-2">
            {copy.regionsTitle}
          </h2>
          <p>{copy.regionsIntro}</p>
        </div>
        <div className={styles.filter}>
          <label htmlFor={filterId} className="at-label">
            {copy.filter}
          </label>
          <select
            id={filterId}
            value={regionFilter}
            onChange={(event) => {
              setRegionFilter(event.target.value);
            }}
          >
            <option value="">{copy.allCountries}</option>
            {withRegions.map((country) => (
              <option key={country.code} value={country.code}>
                {locale === 'es' ? country.name_es : country.name_en}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className="at-visually-hidden">{copy.regionsTitle}</caption>
            <thead>
              <tr>
                <th scope="col">{copy.region}</th>
                <th scope="col">{copy.homeCountry}</th>
                <th scope="col">{copy.owner}</th>
                <th scope="col">{copy.enabled}</th>
              </tr>
            </thead>
            <tbody>
              {shownRegions.map((region) => {
                const pending = scheduledText(region.scheduled, region.apply_on);
                return (
                  <tr key={region.code}>
                    <th scope="row" className="at-place-s">
                      {region.name}
                    </th>
                    <td>{nameOf(region.home_country_code)}</td>
                    <td>{nameOf(region.owner_country_code)}</td>
                    <td>
                      <div className={styles.switchCell}>
                        <Switch
                          label={copy.regionSwitch(region.name)}
                          checked={region.scheduled ?? region.is_enabled}
                          onChange={(next) => {
                            void schedule(
                              supabase.rpc('admin_schedule_region', {
                                p_region_code: region.code,
                                p_enabled: next,
                              }),
                            );
                          }}
                        />
                        {pending ? <span className={styles.pending}>{pending}</span> : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className={styles.section} aria-labelledby="log-title">
        <div>
          <h2 id="log-title" className="at-title-2">
            {copy.logTitle}
          </h2>
          <p>{copy.logIntro}</p>
        </div>
        {log.data?.length === 0 ? <p>{copy.emptyLog}</p> : null}
        {log.data && log.data.length > 0 ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <caption className="at-visually-hidden">{copy.logTitle}</caption>
              <thead>
                <tr>
                  <th scope="col">{copy.when}</th>
                  <th scope="col">{copy.who}</th>
                  <th scope="col">{copy.what}</th>
                  <th scope="col">{copy.before}</th>
                  <th scope="col">{copy.after}</th>
                </tr>
              </thead>
              <tbody>
                {log.data.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDateTime(entry.created_at, locale)}</td>
                    <td>{entry.actor_name}</td>
                    <td>
                      {entry.action in actions
                        ? actions[entry.action as keyof typeof actions]
                        : entry.action}{' '}
                      · {entry.target.includes('-') ? entry.target : nameOf(entry.target)}
                    </td>
                    <td>{describeState(entry.before, copy, locale)}</td>
                    <td>{describeState(entry.after, copy, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Panel>

      <Panel className={styles.section} aria-labelledby="team-title">
        <div>
          <h2 id="team-title" className="at-title-2">
            {copy.teamTitle}
          </h2>
          <p>{copy.teamIntro}</p>
        </div>
        <ul className={styles.team}>
          {team.data?.map((member) => (
            <li key={member.email}>
              <strong>{member.name}</strong> <span>{member.email}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}

function AdminGate() {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);
  const isAdmin = useIsAdmin();
  return (
    <main className={styles.page}>
      <div>
        <p className={styles.eyebrow}>{copy.eyebrow}</p>
        <h1 className="at-title-1">{copy.title}</h1>
      </div>
      {isAdmin.isPending ? null : isAdmin.data ? (
        <AdminPanel />
      ) : (
        <Note tone="info">{copy.notAdmin}</Note>
      )}
    </main>
  );
}

/** Countries, regions, the action log and the team. Every action is checked again by the database. */
export function AdminPage() {
  return (
    <GameShell>
      <CitizenOnly>{() => <AdminGate />}</CitizenOnly>
    </GameShell>
  );
}
