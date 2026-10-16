import { Panel } from '@concordia/atlas/Panel';

import type { CitizenRecord } from '../../features/admin/queries';
import { Avatar } from '../../features/profile/Avatar';
import { useCountryName, useRegionName } from '../../features/world/useNames';
import { formatDate, formatDateTime, formatNumber, useLocale, useMessages } from '../../i18n';

import styles from './AdminPage.module.css';
import { citizenMessages } from './citizenMessages';

/** Who the citizen is: account, document, where they are, standing and description. */
export function CitizenAccount({ record }: { record: CitizenRecord }) {
  const copy = useMessages(citizenMessages);
  const { locale } = useLocale();
  const countryName = useCountryName();
  const regionName = useRegionName();
  return (
    <Panel className={styles.section} aria-labelledby="citizen-account">
      <div className={styles.row}>
        <Avatar name={record.name} path={record.avatar_path} size={56} />
        <h2 id="citizen-account" className="at-title-3">
          {copy.accountTitle}
        </h2>
      </div>
      <dl className={styles.stats}>
        <div>
          <dt>{copy.email}</dt>
          <dd>
            {record.email} · {record.email_confirmed ? copy.emailConfirmed : copy.emailPending}
          </dd>
        </div>
        <div>
          <dt>{copy.signedUp}</dt>
          <dd>{formatDate(record.signed_up_at, locale)}</dd>
        </div>
        <div>
          <dt>{copy.lastSeen}</dt>
          <dd>
            {record.last_sign_in_at ? formatDateTime(record.last_sign_in_at, locale) : copy.never}
          </dd>
        </div>
        <div>
          <dt>{copy.citizenCode}</dt>
          <dd>
            {record.citizen_code ?? '—'} · {countryName(record.country_code)}
          </dd>
        </div>
        <div>
          <dt>{copy.region}</dt>
          <dd>{record.region_code ? regionName(record.region_code) : '—'}</dd>
        </div>
        <div>
          <dt>{copy.standing}</dt>
          <dd>
            {copy.standingValue(record.level, formatNumber(record.strength, locale), record.health)}
          </dd>
        </div>
        <div>
          <dt>{copy.referredBy}</dt>
          <dd>{record.referred_by ?? '—'}</dd>
        </div>
      </dl>
      <div>
        <strong>{copy.bio}</strong>
        <p style={{ whiteSpace: 'pre-wrap' }}>{record.bio || copy.noBio}</p>
      </div>
    </Panel>
  );
}
