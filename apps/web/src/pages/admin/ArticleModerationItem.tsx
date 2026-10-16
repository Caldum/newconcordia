import { Button } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { Status } from '@concordia/atlas/Status';
import { useState } from 'react';

import { useGameAction } from '../../features/actions/useGameAction';
import { hideContent } from '../../features/admin/api';
import { ConsoleFeedback } from '../../features/admin/ConsoleFeedback';
import type { CitizenRecord } from '../../features/admin/queries';
import { unhideContent } from '../../features/moderation/api';
import { formatDateTime, useLocale, useMessages } from '../../i18n';

import styles from './AdminPage.module.css';
import { citizenMessages } from './citizenMessages';

type RecordArticle = CitizenRecord['articles'][number];

/** One article: hiding it with a note (its open reports close), or showing it again. Audited. */
export function ArticleModerationItem({ article }: { article: RecordArticle }) {
  const copy = useMessages(citizenMessages);
  const { locale } = useLocale();
  const [note, setNote] = useState('');
  const hide = useGameAction(() => hideContent('article', String(article.id), note.trim()));
  const show = useGameAction(() => unhideContent('article', String(article.id)));
  return (
    <li>
      <span>
        <strong>{article.title}</strong>{' '}
        {article.hidden ? <Status tone="warning">{copy.hidden}</Status> : null}
        <br />
        <span className={styles.meta}>{formatDateTime(article.published_at, locale)}</span>
      </span>
      {article.hidden ? (
        <div>
          <Button
            variant="secondary"
            disabled={show.pending}
            onClick={() => {
              show.run();
            }}
          >
            {copy.show}
          </Button>
        </div>
      ) : (
        <form
          className={styles.row}
          noValidate
          aria-label={copy.hideOf(article.title)}
          onSubmit={(event) => {
            event.preventDefault();
            hide.run();
          }}
        >
          <Field
            label={copy.note}
            autoComplete="off"
            maxLength={300}
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
              hide.changed();
            }}
          />
          <Button type="submit" variant="war" disabled={hide.pending}>
            {copy.hide}
          </Button>
        </form>
      )}
      <ConsoleFeedback
        problem={hide.problem ?? show.problem}
        copy={copy}
        success={hide.succeeded ? copy.hiddenDone : show.succeeded ? copy.shownDone : null}
      />
    </li>
  );
}
