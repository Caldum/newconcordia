import { useProfileDetails } from '../../features/profile/queries';
import type { Profile } from '../../features/profile/useProfile';
import { useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import { AchievementsPanel } from './AchievementsPanel';
import { AffiliationsPanel } from './AffiliationsPanel';
import { CitizenPanel } from './CitizenPanel';
import { FriendsPanel } from './FriendsPanel';
import { messages } from './messages';
import { ProfileHero } from './ProfileHero';
import styles from './ProfilePage.module.css';
import { ProfileStats } from './ProfileStats';
import { ProfileTabs } from './ProfileTabs';
import { ReferralsPanel } from './ReferralsPanel';

/** The profile once loaded: who the player is, their figures, where they belong and the people around them. */
export function ProfileContent({ profile }: { profile: Profile }) {
  const copy = useMessages(messages);
  const details = useProfileDetails().data;
  useDocumentTitle(copy.documentTitle(profile.name));
  return (
    <>
      <ProfileHero profile={profile} details={details} />
      <main className={styles.main}>
        <ProfileTabs />
        <ProfileStats profile={profile} />
        <div className={styles.grid}>
          <CitizenPanel profile={profile} details={details} />
          <AffiliationsPanel details={details} />
          <AchievementsPanel />
          <FriendsPanel />
          <ReferralsPanel />
        </div>
      </main>
    </>
  );
}
