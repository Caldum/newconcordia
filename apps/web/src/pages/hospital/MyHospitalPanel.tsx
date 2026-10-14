import { Button } from '@concordia/atlas/Button';
import { Note } from '@concordia/atlas/Note';
import { Panel } from '@concordia/atlas/Panel';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { useGoodName } from '../../features/economy/goods';
import { requestTreatment } from '../../features/health/api';
import { useMyHospital } from '../../features/health/queries';
import { useRegionName } from '../../features/world/useNames';
import { useMessages } from '../../i18n';

import { messages } from './messages';

/** The hospital of the region where the player is, and the button to be treated there. */
export function MyHospitalPanel() {
  const copy = useMessages(messages);
  const regionName = useRegionName();
  const goodName = useGoodName();
  const hospital = useMyHospital();
  const treat = useGameAction((key) => requestTreatment(key), { refreshes: [['health']] });
  const here = hospital.data ?? null;
  const result = treat.result ?? null;

  return (
    <Panel className={styles.panel} aria-labelledby="here-title">
      <h2 id="here-title" className="at-title-3">
        {copy.hereTitle}
      </h2>
      {hospital.isError ? <Note tone="error">{copy.loadFailed}</Note> : null}
      {hospital.isSuccess && !here ? <p className={styles.muted}>{copy.noHospital}</p> : null}
      {here ? (
        <>
          <p>
            {copy.hereLine(regionName(here.region_code), here.level)}
            <br />
            <span className={styles.muted}>{copy.policyLine(copy[`policy_${here.policy}`])}</span>
          </p>
          {here.eligible ? null : <Note tone="info">{copy.notEligible}</Note>}
          <ActionFeedback
            problem={treat.problem}
            copy={copy}
            success={
              result ? copy.treated(goodName(result.good_code), result.healed, result.health) : null
            }
          />
          <div>
            <Button
              disabled={!here.eligible || treat.pending}
              onClick={() => {
                treat.run();
              }}
            >
              {copy.treat}
            </Button>
          </div>
        </>
      ) : null}
    </Panel>
  );
}
