import { Note } from '@concordia/atlas/Note';

import { defineMessages, useMessages } from '../../i18n';

import { useBetaStatus } from './queries';

const messages = defineMessages({
  es: {
    closed:
      'Concordia está en beta cerrada: solo puedes crear tu ciudadano con un correo invitado.',
  },
  en: {
    closed: 'Concordia is in closed beta: you can only create your citizen with an invited email.',
  },
});

/** Tells visitors the game is invitation-only while the closed beta is on. */
export function BetaNotice() {
  const copy = useMessages(messages);
  const closed = useBetaStatus().data ?? false;
  return closed ? <Note tone="info">{copy.closed}</Note> : null;
}
