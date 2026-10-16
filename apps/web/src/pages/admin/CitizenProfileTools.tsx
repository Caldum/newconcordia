import { Button } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { Panel } from '@concordia/atlas/Panel';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import { useGameAction } from '../../features/actions/useGameAction';
import { clearProfile, renameCitizen } from '../../features/admin/api';
import { ConsoleFeedback } from '../../features/admin/ConsoleFeedback';
import type { CitizenRecord } from '../../features/admin/queries';
import economy from '../../features/economy/economy.module.css';
import { useMessages } from '../../i18n';

import styles from './AdminPage.module.css';
import { citizenMessages } from './citizenMessages';

/** Removing a citizen's picture and description, and replacing an offensive name. Both audited. */
export function CitizenProfileTools({ record }: { record: CitizenRecord }) {
  const copy = useMessages(citizenMessages);
  const navigate = useNavigate();
  const [clearNote, setClearNote] = useState('');
  const [newName, setNewName] = useState('');
  const [renameNote, setRenameNote] = useState('');
  const clear = useGameAction(() => clearProfile(record.name, clearNote.trim()), {
    onSuccess: () => {
      setClearNote('');
    },
  });
  const rename = useGameAction(
    (_, name: string) => renameCitizen(record.name, name, renameNote.trim()),
    {
      onSuccess: (_, name) => {
        void navigate({ to: '/admin/citizens/$name', params: { name }, replace: true });
      },
    },
  );
  const hasProfile = record.avatar_path !== null || record.bio !== '';

  return (
    <Panel className={styles.section} aria-labelledby="citizen-profile">
      <h2 id="citizen-profile" className="at-title-3">
        {copy.profileTitle}
      </h2>
      {hasProfile ? (
        <form
          className={styles.row}
          noValidate
          aria-label={copy.clearProfile}
          onSubmit={(event) => {
            event.preventDefault();
            clear.run();
          }}
        >
          <Field
            label={copy.note}
            autoComplete="off"
            maxLength={300}
            value={clearNote}
            onChange={(event) => {
              setClearNote(event.target.value);
              clear.changed();
            }}
          />
          <Button type="submit" variant="war" disabled={clear.pending}>
            {copy.clearProfile}
          </Button>
        </form>
      ) : (
        <p>{copy.noBio}</p>
      )}
      <ConsoleFeedback
        problem={clear.problem}
        copy={copy}
        success={clear.succeeded ? copy.cleared : null}
      />
      <div>
        <h3>{copy.renameCitizenTitle}</h3>
        <p className={styles.meta}>{copy.renameCitizenIntro}</p>
      </div>
      <form
        className={economy.form}
        noValidate
        aria-label={copy.renameCitizenTitle}
        onSubmit={(event) => {
          event.preventDefault();
          rename.run(newName.trim());
        }}
      >
        <div className={styles.row}>
          <Field
            label={copy.newName}
            autoComplete="off"
            maxLength={24}
            value={newName}
            onChange={(event) => {
              setNewName(event.target.value);
              rename.changed();
            }}
          />
          <Field
            label={copy.note}
            autoComplete="off"
            maxLength={300}
            value={renameNote}
            onChange={(event) => {
              setRenameNote(event.target.value);
              rename.changed();
            }}
          />
        </div>
        <div>
          <Button type="submit" variant="secondary" disabled={rename.pending}>
            {copy.rename}
          </Button>
        </div>
      </form>
      <ConsoleFeedback problem={rename.problem} copy={copy} />
    </Panel>
  );
}
