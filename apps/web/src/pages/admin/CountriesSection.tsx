import { Note } from '@concordia/atlas/Note';
import { Panel } from '@concordia/atlas/Panel';

import type { Schedule } from '../../features/admin/api';
import type { AdminCountry } from '../../features/admin/queries';
import { countryName } from '../../features/world/names';
import { useLocale, useMessages } from '../../i18n';

import styles from './AdminPage.module.css';
import { messages } from './messages';
import { ScheduledSwitch } from './ScheduledSwitch';

interface CountriesSectionProps {
  countries: readonly AdminCountry[];
  onSchedule: (change: Schedule) => void;
}

/** Every country with its regions, citizens and waitlist, and whether it is in play. */
export function CountriesSection({ countries, onSchedule }: CountriesSectionProps) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const withRegions = countries.filter((country) => country.regions > 0);
  return (
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
            {countries.map((country) => {
              const name = countryName(country, locale);
              return (
                <tr key={country.code}>
                  <th scope="row">{name}</th>
                  <td>{country.regions}</td>
                  <td>{country.citizens}</td>
                  <td>{country.waiting}</td>
                  <td>
                    <ScheduledSwitch
                      label={copy.countrySwitch(name)}
                      current={country.is_active}
                      scheduled={country.scheduled}
                      applyOn={country.apply_on}
                      onChange={(on) => {
                        onSchedule({ target: 'country', code: country.code, on });
                      }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
