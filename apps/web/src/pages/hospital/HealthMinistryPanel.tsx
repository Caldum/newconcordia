import { Panel } from '@concordia/atlas/Panel';

import styles from '../../features/economy/economy.module.css';
import { useGoldPrice } from '../../features/prices/useGoldPrice';
import { formatList, useLocale, useMessages } from '../../i18n';

import { BuildHospitalForm } from './BuildHospitalForm';
import { CarePolicyForm } from './CarePolicyForm';
import { messages } from './messages';
import { MoveKitsForm } from './MoveKitsForm';

/** The Health minister's tools: building hospitals, moving kits and the care policy. */
export function HealthMinistryPanel() {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const build = useGoldPrice('hospital_build').price;
  const upgrades = [
    useGoldPrice('hospital_upgrade_2').price,
    useGoldPrice('hospital_upgrade_3').price,
    useGoldPrice('hospital_upgrade_4').price,
    useGoldPrice('hospital_upgrade_5').price,
  ];

  return (
    <Panel className={styles.panel} aria-labelledby="health-title">
      <h2 id="health-title" className="at-title-3">
        {copy.healthTitle}
      </h2>
      <p className={styles.muted}>{copy.healthHint(build, formatList(upgrades, locale))}</p>
      <BuildHospitalForm />
      <MoveKitsForm />
      <CarePolicyForm />
    </Panel>
  );
}
