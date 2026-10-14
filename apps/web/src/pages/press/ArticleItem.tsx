import { Button } from '@concordia/atlas/Button';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { ReportButton } from '../../features/moderation/ReportButton';
import { readArticle } from '../../features/society/api';
import type { Article } from '../../features/society/queries';
import { formatDateTime, useLocale, useMessages } from '../../i18n';

import { messages } from './messages';

/** One article: its byline, and its text once the player reads it (which counts for the mission). */
export function ArticleItem({ article }: { article: Article }) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const read = useGameAction(() => readArticle(article.article_id), { refreshes: [['press']] });
  const opened = read.result ?? null;

  return (
    <li>
      <span>
        <strong>{article.title}</strong>
        <br />
        <span className={styles.muted}>
          {copy.byline(
            article.newspaper,
            article.author,
            formatDateTime(article.published_at, locale),
          )}{' '}
          · {copy.readers(article.readers)}
        </span>
        {opened ? (
          <>
            <br />
            <span style={{ whiteSpace: 'pre-wrap' }}>{opened.body}</span>
          </>
        ) : null}
        <ActionFeedback problem={read.problem} copy={copy} />
        {opened ? (
          <ReportButton
            kind="article"
            target={String(article.article_id)}
            what={copy.reportWhat(article.title)}
          />
        ) : null}
      </span>
      {opened ? null : (
        <Button
          variant="secondary"
          disabled={read.pending}
          aria-label={copy.readAria(article.title)}
          onClick={() => {
            read.run();
          }}
        >
          {article.read_by_me ? copy.alreadyRead : copy.read}
        </Button>
      )}
    </li>
  );
}
