import { Button } from '@concordia/atlas/Button';
import { Panel } from '@concordia/atlas/Panel';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { Avatar } from '../../features/profile/Avatar';
import { PictureField } from '../../features/profile/PictureField';
import {
  leaveRegiment,
  removeRegimentEmblem,
  uploadRegimentEmblem,
} from '../../features/regiments/api';
import type { MyRegiment } from '../../features/regiments/queries';
import { formatDate, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';
import own from './Regiments.module.css';

/** The player's regiment: its picture (the leader changes it), its members and leaving. */
export function MyRegimentPanel({ regiment }: { regiment: MyRegiment }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const leave = useGameAction(() => leaveRegiment(), { refreshes: [['regiments']] });
  return (
    <>
      <Panel className={styles.panel} aria-labelledby="my-regiment-title">
        <p className={styles.muted}>{copy.mineTitle}</p>
        <div className={own.row}>
          {regiment.is_leader ? null : (
            <Avatar name={regiment.name} path={regiment.emblem_path} size={56} />
          )}
          <h2 id="my-regiment-title" className="at-title-2">
            {regiment.name}
          </h2>
        </div>
        <p className={styles.muted}>
          {copy.members(regiment.members)} ·{' '}
          {regiment.is_leader ? copy.youLead : regiment.leader ? copy.leads(regiment.leader) : null}
        </p>
        <p className={styles.muted}>{copy.since(formatDate(regiment.joined_at, locale))}</p>
        <ActionFeedback problem={leave.problem} copy={copy} />
        <div>
          <Button
            variant="ghost"
            disabled={leave.pending}
            onClick={() => {
              leave.run();
            }}
          >
            {copy.leave}
          </Button>
        </div>
        <p className={styles.muted}>{copy.leaveHint}</p>
      </Panel>
      {regiment.is_leader ? (
        <Panel className={styles.panel} aria-labelledby="regiment-emblem-title">
          <h2 id="regiment-emblem-title" className="at-title-3">
            {copy.emblemTitle}
          </h2>
          <PictureField
            name={regiment.name}
            path={regiment.emblem_path}
            store={(file) => uploadRegimentEmblem(regiment.regiment_id, file)}
            clear={removeRegimentEmblem}
          />
        </Panel>
      ) : null}
    </>
  );
}
