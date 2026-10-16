import { Button } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { useState } from 'react';

import { useGameAction } from '../../features/actions/useGameAction';
import { renameEntity } from '../../features/admin/api';
import type { Rename, RenameKind } from '../../features/admin/api';
import { ConsoleFeedback } from '../../features/admin/ConsoleFeedback';
import { useMessages } from '../../i18n';

import styles from './AdminPage.module.css';
import { citizenMessages } from './citizenMessages';

interface RenameItemProps {
  kind: RenameKind;
  id: number;
  /** What is shown: the current name, or a line about it. */
  label: string;
  name: string;
}

/** Something a citizen named (company, party, regiment, newspaper), and replacing an offensive name. */
export function RenameItem({ kind, id, label, name }: RenameItemProps) {
  const copy = useMessages(citizenMessages);
  const [newName, setNewName] = useState('');
  const [note, setNote] = useState('');
  const rename = useGameAction((_, change: Rename) => renameEntity(change), {
    onSuccess: () => {
      setNewName('');
      setNote('');
    },
  });
  return (
    <li>
      <span>{label}</span>
      <details>
        <summary>{copy.renameOf(name)}</summary>
        <form
          className={styles.row}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            rename.run({ kind, id, newName: newName.trim(), note: note.trim() });
          }}
        >
          <Field
            label={copy.newName}
            autoComplete="off"
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
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
              rename.changed();
            }}
          />
          <Button type="submit" variant="secondary" disabled={rename.pending}>
            {copy.rename}
          </Button>
        </form>
      </details>
      <ConsoleFeedback
        problem={rename.problem}
        copy={copy}
        success={rename.succeeded ? copy.renamed : null}
      />
    </li>
  );
}
