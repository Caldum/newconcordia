import { Note } from '@concordia/atlas/Note';
import { Panel } from '@concordia/atlas/Panel';

import styles from '../../features/economy/economy.module.css';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { useArticles } from '../../features/society/queries';
import { SocietyTabs } from '../../features/society/SocietyTabs';
import { useCountryName } from '../../features/world/useNames';
import { useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import { ArticleItem } from './ArticleItem';
import { messages } from './messages';
import { NewspaperPanel } from './NewspaperPanel';

/** `/press`: the country's articles, reading them, and the player's own newspaper. */
export function PressPage() {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);
  const citizen = useCurrentCitizen();
  const countryName = useCountryName();
  const articles = useArticles(citizen.country_code);
  const rows = articles.data ?? [];

  return (
    <main className={styles.page}>
      <SocietyTabs />
      <div className={styles.intro}>
        <h1 className="at-title-1">{copy.title(countryName(citizen.country_code))}</h1>
        <p className="at-body-l">{copy.intro}</p>
      </div>
      {articles.isError ? <Note tone="error">{copy.loadFailed}</Note> : null}
      <div className={styles.layout}>
        <div className={styles.column}>
          <Panel className={styles.panel} aria-labelledby="articles-title">
            <h2 id="articles-title" className="at-title-3">
              {copy.articlesTitle}
            </h2>
            {articles.isSuccess && rows.length === 0 ? (
              <p className={styles.muted}>{copy.none}</p>
            ) : null}
            <ul className={styles.recipes}>
              {rows.map((a) => (
                <ArticleItem key={a.article_id} article={a} />
              ))}
            </ul>
          </Panel>
        </div>
        <div className={styles.column}>
          <NewspaperPanel />
        </div>
      </div>
    </main>
  );
}
