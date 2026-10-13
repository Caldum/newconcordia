import { Button } from '@concordia/atlas/Button';
import { Note } from '@concordia/atlas/Note';
import { Panel } from '@concordia/atlas/Panel';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import { work } from '../../features/economy/api';
import styles from '../../features/economy/economy.module.css';
import type { Shift } from '../../features/economy/queries';
import { formatMoney, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';

interface SecondShiftProps {
  /** The authorized wage, in hundredths. */
  wage: number;
  /** Today's second shift, once worked. */
  shift: Shift | null;
}

/** The second paid shift the employer authorized: its wage and the button, or what it paid. */
export function SecondShift({ wage, shift }: SecondShiftProps) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const second = useGameAction((key) => work(key));
  return (
    <Panel className={styles.panel} aria-labelledby="second-title">
      <h2 id="second-title" className="at-title-3">
        {copy.secondShiftTitle}
      </h2>
      <p className={styles.muted}>{copy.secondShiftBody(formatMoney(wage, locale))}</p>
      <ActionFeedback problem={second.problem} copy={copy} />
      {shift ? (
        <div role="status">
          <Note tone="ok">{copy.secondDone(formatMoney(shift.net, locale))}</Note>
        </div>
      ) : (
        <div>
          <Button
            disabled={second.pending}
            onClick={() => {
              second.run();
            }}
          >
            {second.pending ? copy.working : copy.workSecond}
          </Button>
        </div>
      )}
    </Panel>
  );
}
