import { Button } from '@concordia/atlas/Button';
import { Panel } from '@concordia/atlas/Panel';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { dismissOfficial } from '../../features/politics/api';
import type { Ministry } from '../../features/politics/api';
import type { CabinetSeat, Office } from '../../features/politics/queries';
import { useMessages } from '../../i18n';

import { messages } from './messages';
import { useOfficeName } from './useOfficeName';

const offices: readonly Office[] = [
  'president',
  'vice_president',
  'minister_economy',
  'minister_defense',
  'minister_foreign_affairs',
  'minister_health',
  'minister_development',
  'central_bank_governor',
];

/** What `dismiss_official` takes for an appointed office; null for the elected ones. */
function dismissable(office: Office): Ministry | 'central_bank_governor' | null {
  if (office === 'central_bank_governor') return office;
  return office.startsWith('minister_') ? (office.slice('minister_'.length) as Ministry) : null;
}

interface CabinetPanelProps {
  seats: readonly CabinetSeat[];
  /** The president may remove ministers and the governor. */
  isPresident: boolean;
}

/** Every executive office, held or vacant; the president can remove the appointed ones. */
export function CabinetPanel({ seats, isPresident }: CabinetPanelProps) {
  const copy = useMessages(messages);
  const officeName = useOfficeName();
  const dismiss = useGameAction(
    (_, office: Ministry | 'central_bank_governor') => dismissOfficial(office),
    { refreshes: [['government']] },
  );

  return (
    <Panel className={styles.panel} aria-labelledby="cabinet-title">
      <h2 id="cabinet-title" className="at-title-3">
        {copy.cabinetTitle}
      </h2>
      <ActionFeedback
        problem={dismiss.problem}
        copy={copy}
        success={dismiss.succeeded ? copy.dismissed : null}
      />
      <ul className={styles.recipes}>
        {offices.map((office) => {
          const seat = seats.find((row) => row.office === office);
          const target = dismissable(office);
          return (
            <li key={office}>
              <span>
                <strong>{officeName(office)}</strong>
                <br />
                <span className={styles.muted}>
                  {seat ? copy.holder(seat.name, seat.party_name) : copy.vacant}
                </span>
              </span>
              {isPresident && seat && target ? (
                <Button
                  variant="ghost"
                  disabled={dismiss.pending}
                  aria-label={copy.dismissLabel(officeName(office))}
                  onClick={() => {
                    dismiss.run(target);
                  }}
                >
                  {copy.dismiss}
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
