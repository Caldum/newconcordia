import { Panel } from '@concordia/atlas/Panel';
import { useId } from 'react';

import styles from '../../features/economy/economy.module.css';
import { isRaw } from '../../features/economy/goods';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { useWorld } from '../../features/world/useWorld';
import { useMessages } from '../../i18n';

import { foundMessages as messages } from './messages';

interface CompanyRegionChoiceProps {
  good: string;
  regionCode: string;
  onChange: (regionCode: string) => void;
}

/** Step 2: where, among the enabled regions of the player's country. */
export function CompanyRegionChoice({ good, regionCode, onChange }: CompanyRegionChoiceProps) {
  const copy = useMessages(messages);
  const citizen = useCurrentCitizen();
  const world = useWorld();
  const selectId = useId();
  const regions = [...(world.data?.regions.values() ?? [])].filter(
    (region) => region.owner_country_code === citizen.country_code && region.is_enabled,
  );
  return (
    <Panel className={styles.panel}>
      <h2 className="at-title-3">{copy.where}</h2>
      <p className={styles.muted}>{isRaw(good) ? copy.whereRaw : copy.whereProduct}</p>
      <div className={styles.field}>
        <label htmlFor={selectId} className={styles.label}>
          {copy.region}
        </label>
        <select
          id={selectId}
          className={styles.select}
          value={regionCode}
          onChange={(event) => {
            onChange(event.target.value);
          }}
        >
          {regions.map((region) => (
            <option key={region.code} value={region.code}>
              {region.name}
            </option>
          ))}
        </select>
      </div>
    </Panel>
  );
}
