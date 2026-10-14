import { Panel } from '@concordia/atlas/Panel';

import { useFriends } from '../../features/profile/queries';
import { useMessages } from '../../i18n';

import { AddFriendForm } from './AddFriendForm';
import { friendMessages } from './friendMessages';
import { FriendRow } from './FriendRow';
import styles from './ProfilePage.module.css';

/** Friends, with the requests to answer first, and asking someone new by name. */
export function FriendsPanel() {
  const copy = useMessages(friendMessages);
  const friends = useFriends().data ?? [];
  const count = friends.filter((friend) => friend.status === 'friend').length;
  return (
    <Panel className={styles.card} aria-labelledby="profile-friends">
      <h2 id="profile-friends" className="at-title-2">
        {copy.title(count)}
      </h2>
      {friends.length > 0 ? (
        <ul className={styles.people}>
          {friends.map((friend) => (
            <FriendRow key={friend.name} friend={friend} />
          ))}
        </ul>
      ) : (
        <p className={styles.note}>{copy.none}</p>
      )}
      <AddFriendForm />
    </Panel>
  );
}
