import { Button } from '@concordia/atlas/Button';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import { upgradeHospital } from '../../features/health/api';
import type { Hospital } from '../../features/health/queries';
import { useRegionName } from '../../features/world/useNames';
import { useMessages } from '../../i18n';

import { messages } from './messages';

const levelMax = 5;

/** One hospital: region and level; the Health minister may raise it. */
export function HospitalItem({
  hospital,
  canUpgrade,
}: {
  hospital: Hospital;
  canUpgrade: boolean;
}) {
  const copy = useMessages(messages);
  const regionName = useRegionName();
  const region = regionName(hospital.region_code);
  const upgrade = useGameAction((key) => upgradeHospital(hospital.region_code, key), {
    refreshes: [['health'], ['finances']],
  });

  return (
    <li>
      <span>
        {copy.hospitalLine(region, hospital.level)}
        <ActionFeedback
          problem={upgrade.problem}
          copy={copy}
          success={typeof upgrade.result === 'number' ? copy.upgraded(upgrade.result) : null}
        />
      </span>
      {canUpgrade && hospital.level < levelMax ? (
        <Button
          variant="secondary"
          disabled={upgrade.pending}
          aria-label={copy.upgradeAria(region)}
          onClick={() => {
            upgrade.run();
          }}
        >
          {copy.upgrade(hospital.level + 1)}
        </Button>
      ) : null}
    </li>
  );
}
