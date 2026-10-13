import { Panel } from '@concordia/atlas/Panel';
import { useId, useState } from 'react';

import type { Schedule } from '../../features/admin/api';
import type { AdminCountry, AdminRegion } from '../../features/admin/queries';
import { countryName } from '../../features/world/names';
import { useLocale, useMessages } from '../../i18n';

import styles from './AdminPage.module.css';
import { messages } from './messages';
import { ScheduledSwitch } from './ScheduledSwitch';

interface RegionsSectionProps {
  countries: readonly AdminCountry[];
  regions: readonly AdminRegion[];
  onSchedule: (change: Schedule) => void;
}

/** Every region, filtered by home country, with its owner and whether it is enabled. */
export function RegionsSection({ countries, regions, onSchedule }: RegionsSectionProps) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const filterId = useId();
  const [homeCountry, setHomeCountry] = useState('');
  const nameOf = (code: string) => {
    const country = countries.find((item) => item.code === code);
    return country ? countryName(country, locale) : code;
  };
  const withRegions = countries.filter((country) => country.regions > 0);
  const shown = regions.filter(
    (region) => !homeCountry || region.home_country_code === homeCountry,
  );

  return (
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
          value={homeCountry}
          onChange={(event) => {
            setHomeCountry(event.target.value);
          }}
        >
          <option value="">{copy.allCountries}</option>
          {withRegions.map((country) => (
            <option key={country.code} value={country.code}>
              {countryName(country, locale)}
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
            {shown.map((region) => (
              <tr key={region.code}>
                <th scope="row" className="at-place-s">
                  {region.name}
                </th>
                <td>{nameOf(region.home_country_code)}</td>
                <td>{nameOf(region.owner_country_code)}</td>
                <td>
                  <ScheduledSwitch
                    label={copy.regionSwitch(region.name)}
                    current={region.is_enabled}
                    scheduled={region.scheduled}
                    applyOn={region.apply_on}
                    onChange={(on) => {
                      onSchedule({ target: 'region', code: region.code, on });
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
