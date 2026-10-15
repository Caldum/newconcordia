import { Panel } from '@concordia/atlas/Panel';

import { useIndependenceHeroes } from '../../features/war/queries';
import { formatNumber, useLocale, useMessages } from '../../i18n';

import styles from './IndependenceWar.module.css';
import { messages } from './messages';

/** The ten nationals with most damage; the first one would be the Liberating Hero. */
export function HeroesPanel({ warId }: { warId: number }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const heroes = useIndependenceHeroes(warId).data ?? [];

  return (
    <Panel aria-labelledby="heroes-title" className={styles.fighter}>
      <h2 id="heroes-title" className="at-title-3">
        {copy.heroesTitle}
      </h2>
      <p className={styles.when}>{copy.heroesHint}</p>
      {heroes.length === 0 ? (
        <p>{copy.heroesEmpty}</p>
      ) : (
        <ol className={styles.heroes}>
          {heroes.map((hero) => (
            <li key={hero.name}>
              <span>
                <span className={styles.heroName}>{hero.name}</span>
                <br />
                <span className={styles.when}>
                  {copy.heroLine(formatNumber(hero.damage, locale), hero.attacks)}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
