import { Button } from '@concordia/atlas/Button';
import { Panel } from '@concordia/atlas/Panel';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { independenceAttack } from '../../features/war/api';
import { useIndependenceWar, useMyTitles } from '../../features/war/queries';
import { useCountryName } from '../../features/world/useNames';
import { formatDateTime, formatNumber, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';

/** The country's independence war (sandbox): progress, the attack and the Liberating Hero. Hidden without one. */
export function IndependencePanel() {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const citizen = useCurrentCitizen();
  const countryName = useCountryName();
  const war = useIndependenceWar(citizen.country_code).data ?? null;
  const titles = useMyTitles().data ?? [];
  const fight = useGameAction((key, warId: number) => independenceAttack(warId, key), {
    refreshes: [['war']],
  });

  if (!war && titles.length === 0) return null;

  return (
    <Panel className={styles.panel} aria-labelledby="independence-title">
      <h2 id="independence-title" className="at-title-3">
        {copy.independenceTitle}
      </h2>
      {war ? (
        <>
          <p className={styles.muted}>{copy.independenceHint}</p>
          <p>
            {copy.independenceProgress(
              formatNumber(war.damage_total, locale),
              formatNumber(war.damage_target, locale),
            )}
            <br />
            {war.status === 'active'
              ? copy.independenceEnds(formatDateTime(war.ends_at, locale))
              : copy[`independence_${war.status}`]}
            {war.hero_name ? (
              <>
                <br />
                {copy.hero(war.hero_name)}
              </>
            ) : null}
          </p>
          <ActionFeedback
            problem={fight.problem}
            copy={copy}
            success={fight.result ? copy.independenceAttacked(fight.result.damage) : null}
          />
          {war.status === 'active' ? (
            <div>
              <Button
                disabled={fight.pending}
                onClick={() => {
                  fight.run(war.war_id);
                }}
              >
                {copy.independenceAttack}
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
      {titles.length > 0 ? (
        <>
          <h3 className="at-title-3">{copy.myTitles}</h3>
          <ul className={styles.recipes}>
            {titles.map((t) => (
              <li key={`${t.title}-${t.granted_at}`}>
                {copy.title_liberating_hero(countryName(t.country_code))}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </Panel>
  );
}
