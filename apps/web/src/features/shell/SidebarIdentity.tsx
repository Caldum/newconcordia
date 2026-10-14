import { Link } from '@tanstack/react-router';

import { useMessages } from '../../i18n';
import { useUnreadCount } from '../notifications/queries';
import { Avatar } from '../profile/Avatar';
import { useProfileDetails } from '../profile/queries';
import { useUnreadMessages } from '../society/queries';

import { useCurrentCitizen } from './CurrentCitizen';
import { InboxLink } from './InboxLink';
import { messages } from './messages';
import styles from './Sidebar.module.css';

/** The picture and name, leading to the profile, and the messages and notices with what is new. */
export function SidebarIdentity() {
  const copy = useMessages(messages);
  const citizen = useCurrentCitizen();
  const details = useProfileDetails().data;
  const unreadMessages = useUnreadMessages().data ?? 0;
  const unreadNotices = useUnreadCount().data ?? 0;
  return (
    <div className={styles.identity}>
      <Link to="/profile" aria-label={copy.profile(citizen.name)} className={styles.who}>
        <Avatar name={citizen.name} path={details?.avatar_path} size={48} />
        <span className={styles.name} aria-hidden="true">
          {citizen.name}
        </span>
      </Link>
      <div className={styles.inbox}>
        <InboxLink
          to="/messages"
          icon="mail"
          count={unreadMessages}
          label={unreadMessages > 0 ? copy.messagesUnread(unreadMessages) : copy.messages}
        />
        <InboxLink
          to="/notifications"
          icon="bell"
          count={unreadNotices}
          label={unreadNotices > 0 ? copy.noticesUnread(unreadNotices) : copy.notices}
        />
      </div>
    </div>
  );
}
