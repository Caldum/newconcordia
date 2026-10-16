import { Field } from '@concordia/atlas/Field';
import { Note } from '@concordia/atlas/Note';
import { Panel } from '@concordia/atlas/Panel';
import { useState } from 'react';

import { AdminOnly } from '../../features/admin/AdminOnly';
import { useCurrentStaff } from '../../features/admin/CurrentStaff';
import { useBalanceParams } from '../../features/admin/queries';
import { useMessages } from '../../i18n';

import styles from './AdminPage.module.css';
import { ConsolePage } from './ConsolePage';
import { ParamItem } from './ParamItem';
import { paramMessages } from './paramMessages';

/** `/admin/params`: every balance parameter, searchable by key or description. */
export function ParamsPage() {
  const copy = useMessages(paramMessages);
  const admin = useCurrentStaff().role === 'admin';
  const params = useBalanceParams(admin);
  const [filter, setFilter] = useState('');
  const all = params.data ?? [];
  const needle = filter.trim().toLowerCase();
  const shown = needle
    ? all.filter(
        (param) =>
          param.key.includes(needle.replaceAll(' ', '_')) ||
          param.description.toLowerCase().includes(needle),
      )
    : all;
  return (
    <ConsolePage title={copy.title} intro={copy.intro}>
      <AdminOnly>
        {params.isError ? <Note tone="error">{copy.loadFailed}</Note> : null}
        <Panel className={styles.section} aria-label={copy.title}>
          <div className={styles.row}>
            <Field
              label={copy.filter}
              type="search"
              autoComplete="off"
              value={filter}
              hint={copy.count(shown.length, all.length)}
              onChange={(event) => {
                setFilter(event.target.value);
              }}
            />
          </div>
          {params.isSuccess && shown.length === 0 ? <p>{copy.none}</p> : null}
          <ul className={styles.list}>
            {shown.map((param) => (
              <ParamItem key={param.key} param={param} />
            ))}
          </ul>
        </Panel>
      </AdminOnly>
    </ConsolePage>
  );
}
