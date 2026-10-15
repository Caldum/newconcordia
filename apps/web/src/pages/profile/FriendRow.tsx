import { Button } from '@concordia/atlas/Button';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import { ReportButton } from '../../features/moderation/ReportButton';
import { answerFriend, removeFriend } from '../../features/profile/api';
import { Avatar } from '../../features/profile/Avatar';
import type { Friend } from '../../features/profile/queries';
import { useCountryName } from '../../features/world/useNames';
import { useMessages } from '../../i18n';

import { friendMessages } from './friendMessages';
import styles from './ProfilePage.module.css';

/** A friend or a pending request, with what can be done about it; friends and requesters can be reported. */
export function FriendRow({ friend }: { friend: Friend }) {
  const copy = useMessages(friendMessages);
  const countryName = useCountryName();
  const answer = useGameAction((_, accept: boolean) => answerFriend(friend.name, accept));
  const remove = useGameAction(() => removeFriend(friend.name));
  const pending = answer.pending || remove.pending;
  return (
    <li className={styles.person}>
      <Avatar name={friend.name} path={friend.avatar_path} size={40} />
      <span className={styles.personText}>
        <span className={styles.strong}>{friend.name}</span>
        <span className={styles.note}>
          {friend.status === 'incoming'
            ? copy.incoming
            : friend.status === 'outgoing'
              ? copy.outgoing
              : countryName(friend.country_code)}
        </span>
      </span>
      <span className={styles.personActions}>
        {friend.status === 'incoming' ? (
          <>
            <Button
              disabled={pending}
              aria-label={copy.acceptAria(friend.name)}
              onClick={() => {
                answer.run(true);
              }}
            >
              {copy.accept}
            </Button>
            <Button
              variant="secondary"
              disabled={pending}
              aria-label={copy.declineAria(friend.name)}
              onClick={() => {
                answer.run(false);
              }}
            >
              {copy.decline}
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            disabled={pending}
            aria-label={
              friend.status === 'friend'
                ? copy.removeAria(friend.name)
                : copy.cancelAria(friend.name)
            }
            onClick={() => {
              remove.run();
            }}
          >
            {friend.status === 'friend' ? copy.remove : copy.cancel}
          </Button>
        )}
      </span>
      {friend.status === 'outgoing' ? null : (
        <ReportButton kind="citizen" target={friend.name} what={copy.reportWhat(friend.name)} />
      )}
      <ActionFeedback problem={answer.problem ?? remove.problem} copy={copy} />
    </li>
  );
}
