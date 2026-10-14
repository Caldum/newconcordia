import { Panel } from '@concordia/atlas/Panel';

import styles from '../../features/economy/economy.module.css';
import { useCarePolicy, useHospitals } from '../../features/health/queries';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { useMessages } from '../../i18n';

import { HospitalItem } from './HospitalItem';
import { messages } from './messages';

/** The country's hospitals with their levels (never their stock) and the care policy. */
export function HospitalsPanel({ canUpgrade }: { canUpgrade: boolean }) {
  const copy = useMessages(messages);
  const citizen = useCurrentCitizen();
  const hospitals = useHospitals(citizen.country_code);
  const policy = useCarePolicy(citizen.country_code).data ?? null;
  const rows = hospitals.data ?? [];

  return (
    <Panel className={styles.panel} aria-labelledby="hospitals-title">
      <h2 id="hospitals-title" className="at-title-3">
        {copy.hospitalsTitle}
      </h2>
      {policy ? (
        <p className={styles.muted}>{copy.policyLine(copy[`policy_${policy.policy}`])}</p>
      ) : null}
      {hospitals.isSuccess && rows.length === 0 ? (
        <p className={styles.muted}>{copy.noHospitals}</p>
      ) : null}
      <ul className={styles.recipes}>
        {rows.map((hospital) => (
          <HospitalItem key={hospital.region_code} hospital={hospital} canUpgrade={canUpgrade} />
        ))}
      </ul>
    </Panel>
  );
}
