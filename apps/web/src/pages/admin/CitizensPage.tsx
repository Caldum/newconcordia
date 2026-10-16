import { Button } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { Panel } from '@concordia/atlas/Panel';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';

import { useCitizenSearch } from '../../features/admin/queries';
import { useCountryName } from '../../features/world/useNames';
import { formatDate, formatDateTime, useLocale, useMessages } from '../../i18n';

import styles from './AdminPage.module.css';
import { citizenMessages } from './citizenMessages';
import { ConsolePage } from './ConsolePage';

/** `/admin/citizens`: finding a citizen by name, email or citizen number (AdminPlayers canvas). */
export function CitizensPage() {
  const copy = useMessages(citizenMessages);
  const { locale } = useLocale();
  const countryName = useCountryName();
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const search = useCitizenSearch(query);
  const rows = search.data ?? [];

  return (
    <ConsolePage title={copy.searchTitle} intro={copy.searchIntro}>
      <Panel className={styles.section} aria-label={copy.searchTitle}>
        <form
          role="search"
          className={styles.row}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            setQuery(text.trim());
          }}
        >
          <Field
            label={copy.search}
            type="search"
            autoComplete="off"
            hint={copy.searchHint}
            value={text}
            onChange={(event) => {
              setText(event.target.value);
            }}
          />
          <Button type="submit" icon="search" disabled={text.trim().length < 2}>
            {copy.search}
          </Button>
        </form>
        <div role="status">
          {search.isFetching ? <p>{copy.searching}</p> : null}
          {search.isSuccess && rows.length === 0 ? <p>{copy.noMatches}</p> : null}
        </div>
        {rows.length > 0 ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <caption className="at-visually-hidden">{copy.searchTitle}</caption>
              <thead>
                <tr>
                  <th scope="col">{copy.name}</th>
                  <th scope="col">{copy.email}</th>
                  <th scope="col">{copy.country}</th>
                  <th scope="col">{copy.level}</th>
                  <th scope="col">{copy.joined}</th>
                  <th scope="col">{copy.lastSeen}</th>
                  <th scope="col">{copy.state}</th>
                  <th scope="col">{copy.reportsOpen}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.name}>
                    <th scope="row">
                      <Link to="/admin/citizens/$name" params={{ name: row.name }}>
                        {row.name}
                      </Link>
                    </th>
                    <td>{row.email}</td>
                    <td>{countryName(row.country_code)}</td>
                    <td>{row.level}</td>
                    <td>{row.joined_at ? formatDate(row.joined_at, locale) : '—'}</td>
                    <td>
                      {row.last_sign_in_at
                        ? formatDateTime(row.last_sign_in_at, locale)
                        : copy.never}
                    </td>
                    <td>{copy[`state_${row.sanction ?? 'ok'}`]}</td>
                    <td>{row.open_reports}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Panel>
    </ConsolePage>
  );
}
