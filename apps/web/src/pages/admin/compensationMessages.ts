import { defineMessages } from '../../i18n';

export const compensationMessages = defineMessages({
  es: {
    title: 'Compensar una transacción',
    hint: 'Ante un incidente, el dinero se devuelve con una transacción inversa: el registro original nunca se edita. Solo revierte dinero; los bienes y cargos se corrigen aparte. Queda registrado.',
    transaction: 'Número de transacción',
    notFound: 'No hay una transacción con ese número.',
    leg: (kind: string, amount: string, currency: string, from: string, to: string) =>
      `${kind}: ${amount} ${currency} de ${from} a ${to}`,
    already: (id: number) => `Ya se compensó con la transacción ${String(id)}.`,
    reason: 'Motivo',
    reasonHint: 'De 3 a 300 caracteres. Se guarda con la compensación.',
    compensate: 'Compensar',
    done: (id: number) => `Listo: transacción compensatoria ${String(id)}.`,
    error_not_admin: 'Solo la administración puede hacerlo.',
    error_transaction_not_found: 'Esa transacción no existe.',
    error_already_compensated: 'Esa transacción ya se compensó.',
    error_not_compensable:
      'Esa transacción toca una reserva de fondos: libérala o cóbrala en su lugar.',
    error_reason_invalid: 'Escribe un motivo de 3 a 300 caracteres.',
    error_insufficient_funds: 'Alguna cuenta ya no tiene ese dinero.',
    error_other: 'No se pudo completar. Revisa tu conexión y vuelve a intentar.',
  },
  en: {
    title: 'Compensate a transaction',
    hint: 'After an incident, money goes back through a reverse transaction: the original record is never edited. It reverses money only; goods and offices are fixed separately. It is logged.',
    transaction: 'Transaction number',
    notFound: 'There is no transaction with that number.',
    leg: (kind: string, amount: string, currency: string, from: string, to: string) =>
      `${kind}: ${amount} ${currency} from ${from} to ${to}`,
    already: (id: number) => `Already compensated by transaction ${String(id)}.`,
    reason: 'Reason',
    reasonHint: '3 to 300 characters. It is kept with the compensation.',
    compensate: 'Compensate',
    done: (id: number) => `Done: compensating transaction ${String(id)}.`,
    error_not_admin: 'Only administrators can do this.',
    error_transaction_not_found: 'That transaction does not exist.',
    error_already_compensated: 'That transaction was already compensated.',
    error_not_compensable: 'That transaction touches a fund hold: release or capture it instead.',
    error_reason_invalid: 'Write a reason of 3 to 300 characters.',
    error_insufficient_funds: 'An account no longer has that money.',
    error_other: 'It did not go through. Check your connection and try again.',
  },
});
