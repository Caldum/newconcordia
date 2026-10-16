import { Button } from '@concordia/atlas/Button';
import { Panel } from '@concordia/atlas/Panel';
import { useId, useState } from 'react';

import { useGameAction } from '../../features/actions/useGameAction';
import { addStaffNote } from '../../features/admin/api';
import { ConsoleFeedback } from '../../features/admin/ConsoleFeedback';
import type { CitizenRecord } from '../../features/admin/queries';
import economy from '../../features/economy/economy.module.css';
import { formatDateTime, useLocale, useMessages } from '../../i18n';

import styles from './AdminPage.module.css';
import { citizenMessages } from './citizenMessages';

/** What the team wrote down about the citizen, and adding a note. */
export function CitizenNotes({ record }: { record: CitizenRecord }) {
  const copy = useMessages(citizenMessages);
  const { locale } = useLocale();
  const fieldId = useId();
  const [body, setBody] = useState('');
  const add = useGameAction(() => addStaffNote(record.name, body.trim()), {
    onSuccess: () => {
      setBody('');
    },
  });
  return (
    <Panel className={styles.section} aria-labelledby="citizen-notes">
      <div>
        <h2 id="citizen-notes" className="at-title-3">
          {copy.notesTitle}
        </h2>
        <p>{copy.notesIntro}</p>
      </div>
      {record.notes.length === 0 ? <p>{copy.noNotes}</p> : null}
      <ul className={styles.list}>
        {record.notes.map((note) => (
          <li key={note.id}>
            <span style={{ whiteSpace: 'pre-wrap' }}>{note.body}</span>
            <span className={styles.meta}>
              {copy.noteBy(note.author ?? '—', formatDateTime(note.created_at, locale))}
            </span>
          </li>
        ))}
      </ul>
      <form
        className={economy.form}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          add.run();
        }}
      >
        <div className={economy.field}>
          <label htmlFor={fieldId} className={economy.label}>
            {copy.newNote}
          </label>
          <textarea
            id={fieldId}
            className={styles.textarea}
            maxLength={1000}
            value={body}
            onChange={(event) => {
              setBody(event.target.value);
              add.changed();
            }}
          />
        </div>
        <div>
          <Button type="submit" variant="secondary" disabled={add.pending}>
            {copy.addNote}
          </Button>
        </div>
      </form>
      <ConsoleFeedback
        problem={add.problem}
        copy={copy}
        success={add.succeeded ? copy.noteSaved : null}
      />
    </Panel>
  );
}
