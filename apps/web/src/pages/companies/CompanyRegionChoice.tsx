import { Panel } from '@concordia/atlas/Panel';
import { useId } from 'react';

import styles from '../../features/economy/economy.module.css';
import { isRaw } from '../../features/economy/goods';
import { useResourceName } from '../../features/world/resourceNames';
import { useRegionResources } from '../../features/world/resources';
import { useCountryName } from '../../features/world/useNames';
import type { Region } from '../../features/world/useWorld';
import { useMessages } from '../../i18n';

import { foundMessages as messages } from './messages';

interface CompanyRegionChoiceProps {
  good: string;
  regions: readonly Region[];
  regionCode: string | null;
  onChange: (regionCode: string) => void;
}

/** Step 2: where. Any region in play; an extractor only where its resource exists. */
export function CompanyRegionChoice({
  good,
  regions,
  regionCode,
  onChange,
}: CompanyRegionChoiceProps) {
  const copy = useMessages(messages);
  const countryName = useCountryName();
  const resourceName = useResourceName();
  const resources = useRegionResources().data;
  const selectId = useId();
  const here = regionCode ? (resources?.get(regionCode) ?? []) : [];
  return (
    <Panel className={styles.panel}>
      <h2 className="at-title-3">{copy.where}</h2>
      <p className={styles.muted}>{isRaw(good) ? copy.whereRaw : copy.whereProduct}</p>
      {regions.length === 0 ? (
        <p>{copy.noRegion}</p>
      ) : (
        <div className={styles.field}>
          <label htmlFor={selectId} className={styles.label}>
            {copy.region}
          </label>
          <select
            id={selectId}
            className={styles.select}
            value={regionCode ?? ''}
            onChange={(event) => {
              onChange(event.target.value);
            }}
          >
            {regions.map((region) => (
              <option key={region.code} value={region.code}>
                {`${region.name} · ${countryName(region.owner_country_code)}`}
              </option>
            ))}
          </select>
        </div>
      )}
      {here.length > 0 ? (
        <p className={styles.muted}>
          {copy.regionResources(here.map((resource) => resourceName(resource.code)).join(', '))}
        </p>
      ) : null}
    </Panel>
  );
}
