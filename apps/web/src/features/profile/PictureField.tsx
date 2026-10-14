import { Button } from '@concordia/atlas/Button';
import { useId } from 'react';

import { useMessages } from '../../i18n';
import { ActionFeedback } from '../actions/ActionFeedback';
import { useGameAction } from '../actions/useGameAction';

import { Avatar } from './Avatar';
import styles from './PictureField.module.css';
import { pictureMessages } from './pictureMessages';
import { pictureAccept } from './pictures';

type Outcome = PromiseLike<{ data: unknown; error: unknown }>;

interface PictureFieldProps {
  /** Whose picture: its initials stand in without one. */
  name: string;
  path: string | null | undefined;
  /** Shrinks, uploads and records a chosen file (a feature's `api.ts`). */
  store: (file: File) => Outcome;
  /** Goes back to the initials. */
  clear: () => Outcome;
}

/** A picture with choosing a new one and removing it: a citizen's, a party's or a regiment's. */
export function PictureField({ name, path, store, clear }: PictureFieldProps) {
  const copy = useMessages(pictureMessages);
  const inputId = useId();
  const upload = useGameAction((_, file: File) => store(file), { refreshes: [['pictures']] });
  const remove = useGameAction(() => clear(), { refreshes: [['pictures']] });
  const pending = upload.pending || remove.pending;
  return (
    <div className={styles.field}>
      <div className={styles.picture}>
        <Avatar name={name} path={path} size={112} />
        <div className={styles.actions}>
          <p className={styles.hint}>{copy.hint}</p>
          <div className={styles.buttons}>
            <input
              id={inputId}
              type="file"
              accept={pictureAccept}
              className="at-visually-hidden"
              disabled={pending}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                remove.changed();
                if (file) upload.run(file);
              }}
            />
            <label
              htmlFor={inputId}
              className={styles.fileButton}
              aria-disabled={pending || undefined}
            >
              {pending ? copy.saving : copy.choose}
            </label>
            {path ? (
              <Button
                variant="ghost"
                disabled={pending}
                onClick={() => {
                  upload.changed();
                  remove.run();
                }}
              >
                {copy.remove}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      <ActionFeedback
        problem={upload.problem ?? remove.problem}
        copy={copy}
        success={upload.succeeded ? copy.saved : remove.succeeded ? copy.removed : null}
      />
    </div>
  );
}
