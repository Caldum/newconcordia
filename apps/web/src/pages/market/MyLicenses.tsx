import { Panel } from '@concordia/atlas/Panel';

import styles from '../../features/economy/economy.module.css';
import type { MarketLicense } from '../../features/market/queries';
import { useCountryName } from '../../features/world/useNames';
import { formatDate, useLocale, useMessages } from '../../i18n';

import { licensesMessages } from './licensesMessages';

/** The foreign markets the player may trade in. */
export function MyLicenses({ licenses }: { licenses: readonly MarketLicense[] }) {
  const copy = useMessages(licensesMessages);
  const { locale } = useLocale();
  const countryName = useCountryName();
  return (
    <Panel className={styles.panel} aria-labelledby="my-licenses-title">
      <h2 id="my-licenses-title" className="at-title-3">
        {copy.mineTitle}
      </h2>
      {licenses.length === 0 ? <p className={styles.muted}>{copy.noMine}</p> : null}
      <ul className={styles.recipes}>
        {licenses.map((license) => (
          <li key={license.market_country_code}>
            <span>{countryName(license.market_country_code)}</span>
            <span className={styles.muted}>
              {copy.since(formatDate(license.granted_at, locale))}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
