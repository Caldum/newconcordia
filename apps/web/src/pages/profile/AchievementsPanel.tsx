import { Icon } from '@concordia/atlas/Icon';
import { Panel } from '@concordia/atlas/Panel';

import { useAchievements } from '../../features/profile/queries';
import { formatDate, useLocale, useMessages } from '../../i18n';

import { achievementMessages } from './achievementMessages';
import { messages } from './messages';
import styles from './ProfilePage.module.css';

/** Every achievement: the ones earned first, with when, then the ones still ahead. */
export function AchievementsPanel() {
  const copy = useMessages(messages);
  const names = useMessages(achievementMessages);
  const { locale } = useLocale();
  const achievements = useAchievements().data;
  if (!achievements) return null;
  const earned = achievements.filter((item) => item.achieved);
  const ahead = achievements.filter((item) => !item.achieved);
  return (
    <Panel className={styles.card} aria-labelledby="profile-achievements">
      <h2 id="profile-achievements" className="at-title-2">
        {copy.achievements(earned.length, achievements.length)}
      </h2>
      <ul className={styles.medals}>
        {[...earned, ...ahead].map((item) => (
          <li key={item.achievement} className={item.achieved ? styles.earned : styles.ahead}>
            <Icon name={item.achieved ? 'star' : 'lock'} size={18} />
            <span>
              <span className={styles.strong}>{names[item.achievement]}</span>
              <span className={styles.note}>
                {item.achieved
                  ? item.achieved_at
                    ? copy.earnedOn(formatDate(item.achieved_at, locale))
                    : copy.earned
                  : copy.notYet}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
