import { Panel } from '@concordia/atlas/Panel';

import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { useCountryName } from '../../features/world/useNames';
import { useMessages } from '../../i18n';

import styles from './CitizenshipPage.module.css';
import { changeMessages as messages } from './messages';

/** What the player loses and keeps by changing country. */
export function WhatChangesPanel() {
  const copy = useMessages(messages);
  const citizen = useCurrentCitizen();
  const countryName = useCountryName();
  return (
    <Panel className={styles.panel} aria-labelledby="changes-title">
      <h2 id="changes-title" className="at-title-3">
        {copy.whatChanges}
      </h2>
      <ul className={styles.limits}>
        <li>{copy.losesOffices(countryName(citizen.country_code))}</li>
        <li>{copy.newNumber}</li>
        <li>{copy.keeps}</li>
        <li>{copy.limit}</li>
      </ul>
    </Panel>
  );
}
