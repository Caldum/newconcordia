import { Note } from '@concordia/atlas/Note';

import { useProfile } from '../../features/profile/useProfile';
import { useMessages } from '../../i18n';

import { messages } from './messages';
import { ProfileContent } from './ProfileContent';
import styles from './ProfilePage.module.css';

/** `/profile`: the signed-in player's attributes (Profile canvas). */
export function ProfilePage() {
  const copy = useMessages(messages);
  const profile = useProfile();
  if (profile.data) return <ProfileContent profile={profile.data} />;
  if (profile.isError) {
    return (
      <main className={styles.main}>
        <Note tone="error">{copy.loadFailed}</Note>
      </main>
    );
  }
  return null;
}
