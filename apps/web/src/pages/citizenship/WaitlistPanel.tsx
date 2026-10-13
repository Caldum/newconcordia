import { Button } from '@concordia/atlas/Button';
import { Panel } from '@concordia/atlas/Panel';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import { leaveWaitlist } from '../../features/citizenship/api';
import { useMyWaitlist } from '../../features/citizenship/queries';
import { useCountryName } from '../../features/world/useNames';
import { useMessages } from '../../i18n';

import styles from './CitizenshipPage.module.css';
import { messages } from './messages';

/** The player's place on a full country's waitlist, and leaving it. Nothing when not waiting. */
export function WaitlistPanel() {
  const copy = useMessages(messages);
  const countryName = useCountryName();
  const waitlist = useMyWaitlist();
  const leave = useGameAction(() => leaveWaitlist());
  if (!waitlist.data) return null;
  return (
    <Panel className={styles.panel} aria-labelledby="waitlist-title">
      <h2 id="waitlist-title" className="at-title-3">
        {copy.waitlistTitle}
      </h2>
      <p>{copy.waitlistBody(countryName(waitlist.data.country_code), waitlist.data.place)}</p>
      <ActionFeedback problem={leave.problem} copy={copy} />
      <div>
        <Button
          variant="secondary"
          disabled={leave.pending}
          onClick={() => {
            leave.run();
          }}
        >
          {copy.leaveWaitlist}
        </Button>
      </div>
    </Panel>
  );
}
