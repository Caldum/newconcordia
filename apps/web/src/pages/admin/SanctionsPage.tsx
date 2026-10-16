import { Panel } from '@concordia/atlas/Panel';
import { Segmented } from '@concordia/atlas/Segmented';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';

import { useSanctions } from '../../features/admin/queries';
import { formatDateTime, useLocale, useMessages } from '../../i18n';

import styles from './AdminPage.module.css';
import { citizenMessages } from './citizenMessages';
import { ConsolePage } from './ConsolePage';

type Show = 'active' | 'all';

/** `/admin/sanctions`: sanctions in force (or every one), with who set and who lifted them. */
export function SanctionsPage() {
  const copy = useMessages(citizenMessages);
  const { locale } = useLocale();
  const [show, setShow] = useState<Show>('active');
  const sanctions = useSanctions(show === 'active');
  const rows = sanctions.data ?? [];
  const when = (value: string) => formatDateTime(value, locale);
  return (
    <ConsolePage
      title={copy.sanctionsTitle}
      intro={copy.sanctionsIntro}
      aside={
        <Segmented
          label={copy.showLabel}
          segments={[
            { value: 'active', label: copy.show_active },
            { value: 'all', label: copy.show_all },
          ]}
          value={show}
          onChange={setShow}
        />
      }
    >
      <Panel className={styles.section} aria-label={copy.sanctionsTitle}>
        {sanctions.isSuccess && rows.length === 0 ? <p>{copy.noActive}</p> : null}
        <ul className={styles.list}>
          {rows.map((row) => (
            <li key={row.sanction_id}>
              <span>
                <Link to="/admin/citizens/$name" params={{ name: row.citizen_name }}>
                  {row.citizen_name}
                </Link>{' '}
                · {copy.sanctionLine(copy[`kind_${row.kind}`], copy[`reason_${row.reason}`])}
              </span>
              <span className={styles.meta}>
                {copy.since(when(row.starts_at))}{' '}
                {row.kind === 'warning'
                  ? null
                  : row.ends_at
                    ? copy.until(when(row.ends_at))
                    : copy.forever}{' '}
                · {copy.setBy(row.created_by ?? '—')}
                {row.revoked_at
                  ? ` · ${copy.revokedBy(row.revoked_by ?? '—', when(row.revoked_at))}`
                  : null}
              </span>
              {row.note ? <span>«{row.note}»</span> : null}
            </li>
          ))}
        </ul>
      </Panel>
    </ConsolePage>
  );
}
