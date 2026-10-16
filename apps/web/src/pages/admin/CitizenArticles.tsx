import { Panel } from '@concordia/atlas/Panel';

import type { CitizenRecord } from '../../features/admin/queries';
import { useMessages } from '../../i18n';

import styles from './AdminPage.module.css';
import { ArticleModerationItem } from './ArticleModerationItem';
import { citizenMessages } from './citizenMessages';

/** The citizen's latest articles, each hidden or shown again by moderation. */
export function CitizenArticles({ articles }: { articles: CitizenRecord['articles'] }) {
  const copy = useMessages(citizenMessages);
  return (
    <Panel className={styles.section} aria-labelledby="citizen-articles">
      <h2 id="citizen-articles" className="at-title-3">
        {copy.articlesTitle}
      </h2>
      {articles.length === 0 ? <p>{copy.noArticles}</p> : null}
      <ul className={styles.list}>
        {articles.map((article) => (
          <ArticleModerationItem key={article.id} article={article} />
        ))}
      </ul>
    </Panel>
  );
}
