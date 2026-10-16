import { Button } from '@concordia/atlas/Button';
import { useId, useState } from 'react';

import { ActionFeedback } from '../../features/actions/ActionFeedback';
import { useGameAction } from '../../features/actions/useGameAction';
import styles from '../../features/economy/economy.module.css';
import { registerTicket } from '../../features/politics/api';
import type { NewTicket } from '../../features/politics/api';
import { usePartyMembers } from '../../features/politics/queries';
import { useGoldPrice } from '../../features/prices/useGoldPrice';
import { useMessages } from '../../i18n';

import { messages } from './messages';

/** The party leader picks the ticket among the members and registers it. */
export function TicketForm({ partyId }: { partyId: number }) {
  const copy = useMessages(messages);
  const price = useGoldPrice('presidential_ticket');
  const members = usePartyMembers(partyId);
  const presidentId = useId();
  const viceId = useId();
  const [president, setPresident] = useState('');
  const [vice, setVice] = useState('');
  const register = useGameAction((_, ticket: NewTicket) => registerTicket(ticket), {
    refreshes: [['elections']],
  });
  const options = (members.data ?? []).map((member) => (
    <option key={member.name} value={member.name}>
      {copy.memberOption(member.name, member.civil_level)}
    </option>
  ));

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (!president || !vice) return;
        register.run({ president, vicePresident: vice });
      }}
    >
      <h3 className="at-title-3">{copy.ticketFormTitle}</h3>
      <p className={styles.muted}>{copy.ticketFormIntro(price)}</p>
      <div className={styles.field}>
        <label htmlFor={presidentId} className={styles.label}>
          {copy.presidentCandidate}
        </label>
        <select
          id={presidentId}
          className={styles.select}
          value={president}
          onChange={(event) => {
            setPresident(event.target.value);
            register.changed();
          }}
        >
          <option value="">{copy.choose}</option>
          {options}
        </select>
      </div>
      <div className={styles.field}>
        <label htmlFor={viceId} className={styles.label}>
          {copy.viceCandidate}
        </label>
        <select
          id={viceId}
          className={styles.select}
          value={vice}
          onChange={(event) => {
            setVice(event.target.value);
            register.changed();
          }}
        >
          <option value="">{copy.choose}</option>
          {options}
        </select>
      </div>
      <ActionFeedback
        problem={register.problem}
        copy={copy}
        success={register.succeeded ? copy.ticketRegistered : null}
      />
      <div>
        <Button type="submit" disabled={register.pending || !president || !vice}>
          {copy.registerTicket}
        </Button>
      </div>
    </form>
  );
}
