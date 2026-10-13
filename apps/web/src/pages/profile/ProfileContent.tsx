import type { Profile } from '../../features/profile/useProfile';
import { useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import { messages } from './messages';
import { ProfileHero } from './ProfileHero';
import styles from './ProfilePage.module.css';
import { ProfilePath } from './ProfilePath';
import { ProfileStats } from './ProfileStats';
import { ProfileTabs } from './ProfileTabs';

/** The profile once loaded: who the player is, their figures and their path. */
export function ProfileContent({ profile }: { profile: Profile }) {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle(profile.name));
  return (
    <>
      <ProfileHero profile={profile} />
      <main className={styles.main}>
        <ProfileTabs />
        <ProfileStats profile={profile} />
        <ProfilePath profile={profile} />
      </main>
    </>
  );
}
