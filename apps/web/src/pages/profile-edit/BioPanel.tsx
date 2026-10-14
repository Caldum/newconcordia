import { Button } from '@concordia/atlas/Button';
import { Panel } from '@concordia/atlas/Panel';
import { useId, useState } from 'react';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import { setMyBio } from '../../features/profile/api';
import { useMessages } from '../../i18n';

import styles from './EditProfile.module.css';
import { messages } from './messages';

/** Characters of a description; the database checks the same limit (bio_max_length). */
const bioMax = 500;

/** The description shown under the name on the profile. */
export function BioPanel({ saved }: { saved: string }) {
  const copy = useMessages(messages);
  const fieldId = useId();
  const hintId = useId();
  const [bio, setBio] = useState(saved);
  const save = useGameAction((_, value: string) => setMyBio(value));
  const left = bioMax - bio.trim().length;
  return (
    <Panel className={styles.panel} aria-labelledby="edit-bio">
      <h2 id="edit-bio" className="at-title-2">
        {copy.bioTitle}
      </h2>
      <form
        className={styles.form}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (left >= 0) save.run(bio.trim());
        }}
      >
        <label htmlFor={fieldId} className={styles.label}>
          {copy.bio}
        </label>
        <textarea
          id={fieldId}
          className={styles.textarea}
          rows={6}
          value={bio}
          aria-describedby={hintId}
          aria-invalid={left < 0}
          onChange={(event) => {
            setBio(event.target.value);
            save.changed();
          }}
        />
        <p id={hintId} className={left < 0 ? styles.error : styles.hint}>
          {left < 0 ? copy.bioTooLong : copy.bioHint(left)}
        </p>
        <ActionFeedback
          problem={save.problem}
          copy={copy}
          success={save.succeeded ? copy.bioSaved : null}
        />
        <div>
          <Button type="submit" disabled={save.pending || left < 0}>
            {copy.saveBio}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
