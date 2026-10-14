import { Button } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { useState } from 'react';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import { requestFriend } from '../../features/profile/api';
import { useMessages } from '../../i18n';

import { friendMessages } from './friendMessages';
import styles from './ProfilePage.module.css';

/** Asking a citizen to be friends by their name. */
export function AddFriendForm() {
  const copy = useMessages(friendMessages);
  const [name, setName] = useState('');
  const add = useGameAction((_, value: string) => requestFriend(value), {
    onSuccess: () => {
      setName('');
    },
  });
  return (
    <form
      className={styles.inlineForm}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (name.trim().length > 0) add.run(name.trim());
      }}
    >
      <Field
        label={copy.name}
        autoComplete="off"
        value={name}
        onChange={(event) => {
          setName(event.target.value);
          add.changed();
        }}
      />
      <div>
        <Button type="submit" variant="secondary" disabled={add.pending}>
          {copy.add}
        </Button>
      </div>
      <ActionFeedback
        problem={add.problem}
        copy={copy}
        success={
          add.succeeded ? (add.result === 'accepted' ? copy.nowFriends : copy.requested) : null
        }
      />
    </form>
  );
}
