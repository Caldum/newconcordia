import { defineMessages } from '../../i18n';

export const messages = defineMessages({
  es: {
    documentTitle: 'Avisos · Concordia',
    title: 'Avisos',
    intro: 'Lo que te pasó a ti y lo que pasó en tu país: batallas, leyes, mociones y elecciones.',
    loadFailed: 'No se pudieron cargar los avisos. Recarga la página para intentar de nuevo.',
    none: 'No tienes avisos.',
    markSeen: 'Marcar todo como leído',
    marked: 'Todo está leído.',
    unread: 'Nuevo',
    injury: (lost: number, after: number) =>
      `Te lesionaste: perdiste ${String(lost)} de salud y quedaste en ${String(after)}.`,
    office_taken: 'Asumiste un cargo nacional.',
    friend_requested: (name: string) => `${name} quiere ser tu amigo. Respóndele desde tu perfil.`,
    friend_accepted: (name: string) => `${name} aceptó tu amistad.`,
    citizenship_approved: (country: string) => `Aprobaron tu ciudadanía de ${country}.`,
    citizenship_rejected: (country: string) => `Rechazaron tu ciudadanía de ${country}.`,
    battle_started: (attacker: string, defender: string, region: string) =>
      `Empezó una batalla por ${region}: ${attacker} contra ${defender}.`,
    battle_finished: (winner: string, region: string) =>
      `Terminó la batalla por ${region}: ganó ${winner}.`,
    bill_presented: (title: string) =>
      `Se presentó el proyecto «${title}». El Congreso vota durante 24 horas.`,
    bill_closed: (title: string, status: string) => `Tu proyecto «${title}» terminó: ${status}.`,
    bill_executed: 'aprobado y en vigor',
    bill_rejected: 'rechazado',
    bill_not_executed: 'aprobado pero no ejecutado',
    motion_opened: (target: string) => `El Congreso abrió una moción sobre ${target}.`,
    war_authorized: (country: string) => `Se autorizó una ofensiva contra ${country} por 24 horas.`,
    election_voting: (kind: string) => `Ya se vota la elección ${kind}.`,
    election_president: 'presidencial',
    election_congress: 'del Congreso',
    other: 'Hubo novedades.',
    error_other: 'No se pudo completar. Revisa tu conexión y vuelve a intentar.',
  },
  en: {
    documentTitle: 'Notices · Concordia',
    title: 'Notices',
    intro: 'What happened to you and in your country: battles, laws, motions and elections.',
    loadFailed: 'The notices did not load. Reload the page to try again.',
    none: 'You have no notices.',
    markSeen: 'Mark all as read',
    marked: 'Everything is read.',
    unread: 'New',
    injury: (lost: number, after: number) =>
      `You got injured: you lost ${String(lost)} health and are at ${String(after)}.`,
    office_taken: 'You took a national office.',
    friend_requested: (name: string) =>
      `${name} wants to be your friend. Answer from your profile.`,
    friend_accepted: (name: string) => `${name} accepted your friendship.`,
    citizenship_approved: (country: string) => `Your citizenship of ${country} was approved.`,
    citizenship_rejected: (country: string) => `Your citizenship of ${country} was rejected.`,
    battle_started: (attacker: string, defender: string, region: string) =>
      `A battle for ${region} started: ${attacker} against ${defender}.`,
    battle_finished: (winner: string, region: string) =>
      `The battle for ${region} ended: ${winner} won.`,
    bill_presented: (title: string) =>
      `The bill «${title}» was presented. Congress votes for 24 hours.`,
    bill_closed: (title: string, status: string) => `Your bill «${title}» ended: ${status}.`,
    bill_executed: 'approved and in force',
    bill_rejected: 'rejected',
    bill_not_executed: 'approved but not executed',
    motion_opened: (target: string) => `Congress opened a motion about ${target}.`,
    war_authorized: (country: string) =>
      `An offensive against ${country} is authorized for 24 hours.`,
    election_voting: (kind: string) => `Voting is open in the ${kind} election.`,
    election_president: 'presidential',
    election_congress: 'Congress',
    other: 'There is news.',
    error_other: 'It did not go through. Check your connection and try again.',
  },
});
