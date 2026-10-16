import { Button } from '@concordia/atlas/Button';
import { useState } from 'react';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { registerPartyList } from '../../features/politics/api';
import { addToList, moveUp, removeFromList } from '../../features/politics/listDraft';
import type { ListDraft } from '../../features/politics/listDraft';
import { usePartyMembers } from '../../features/politics/queries';
import { useGoldPrice } from '../../features/prices/useGoldPrice';
import { useMessages } from '../../i18n';

import { messages } from './messages';

/** The party leader orders the list for Congress among the members and registers it. */
export function PartyListForm({ partyId }: { partyId: number }) {
  const copy = useMessages(messages);
  const price = useGoldPrice('party_list');
  const members = usePartyMembers(partyId);
  const [list, setList] = useState<ListDraft>([]);
  const register = useGameAction((_, names: ListDraft) => registerPartyList(names), {
    refreshes: [['elections']],
  });
  const edit = (next: ListDraft) => {
    setList(next);
    register.changed();
  };
  const outside = (members.data ?? []).filter((member) => !list.includes(member.name));

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (list.length === 0) return;
        register.run(list);
      }}
    >
      <h3 className="at-title-3">{copy.listFormTitle}</h3>
      <p className={styles.muted}>{copy.listFormIntro(price)}</p>
      {list.length === 0 ? <p className={styles.muted}>{copy.emptyList}</p> : null}
      <ol className={styles.recipes}>
        {list.map((name, index) => (
          <li key={name}>
            <span>{copy.position(index + 1, name)}</span>
            <span>
              {index > 0 ? (
                <Button
                  variant="ghost"
                  aria-label={copy.upLabel(name)}
                  onClick={() => {
                    edit(moveUp(list, name));
                  }}
                >
                  {copy.up}
                </Button>
              ) : null}
              <Button
                variant="ghost"
                aria-label={copy.removeLabel(name)}
                onClick={() => {
                  edit(removeFromList(list, name));
                }}
              >
                {copy.remove}
              </Button>
            </span>
          </li>
        ))}
      </ol>
      <ul className={styles.recipes}>
        {outside.map((member) => (
          <li key={member.name}>
            <span>{copy.memberOption(member.name, member.civil_level)}</span>
            <Button
              variant="secondary"
              aria-label={copy.addLabel(member.name)}
              onClick={() => {
                edit(addToList(list, member.name));
              }}
            >
              {copy.add}
            </Button>
          </li>
        ))}
      </ul>
      <ActionFeedback
        problem={register.problem}
        copy={copy}
        success={register.succeeded ? copy.listRegistered : null}
      />
      <div>
        <Button type="submit" disabled={register.pending || list.length === 0}>
          {copy.registerList}
        </Button>
      </div>
    </form>
  );
}
