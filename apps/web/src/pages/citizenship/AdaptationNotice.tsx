import { Note } from '@concordia/atlas/Note';
import { Panel } from '@concordia/atlas/Panel';
import { Status } from '@concordia/atlas/Status';

import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { formatDate, useLocale, useMessages } from '../../i18n';
import { useNow } from '../../lib/useNow';

import styles from './CitizenshipPage.module.css';
import { messages } from './messages';

const dayMs = 24 * 60 * 60 * 1000;

/** The first week's limits while they last; afterwards, when voting opens if it is still ahead. */
export function AdaptationNotice() {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const citizen = useCurrentCitizen();
  const now = useNow();

  if (now < Date.parse(citizen.adaptation_ends_at)) {
    const day = Math.min(7, Math.floor((now - Date.parse(citizen.joined_at)) / dayMs) + 1);
    return (
      <Panel className={styles.panel} aria-labelledby="adaptation-title">
        <div className={styles.panelHead}>
          <h2 id="adaptation-title" className="at-title-3">
            {copy.adaptationTitle}
          </h2>
          <Status tone="nation">{copy.adaptationDay(day)}</Status>
        </div>
        <p>{copy.adaptationIntro(formatDate(citizen.adaptation_ends_at, locale))}</p>
        <ul className={styles.limits}>
          <li>
            <strong>{copy.halfDamage}</strong>
            <span>{copy.halfDamageBody}</span>
          </li>
          <li>
            <strong>{copy.noVote}</strong>
            <span>{copy.noVoteBody}</span>
          </li>
        </ul>
      </Panel>
    );
  }
  if (now < Date.parse(citizen.votes_in_elections_from)) {
    return (
      <Note tone="info">{copy.votesFrom(formatDate(citizen.votes_in_elections_from, locale))}</Note>
    );
  }
  return null;
}
