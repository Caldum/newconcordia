import { defineMessages } from '../../i18n';

export const reportMessages = defineMessages({
  es: {
    report: 'Denunciar',
    reportAria: (what: string) => `Denunciar ${what}`,
    formTitle: 'Denunciar a la moderación',
    reason: 'Motivo',
    reason_spam: 'Spam o publicidad',
    reason_abuse: 'Insultos o acoso',
    reason_hate: 'Odio o discriminación',
    reason_cheating: 'Trampas o cuentas múltiples',
    reason_other: 'Otro',
    details: 'Detalles (opcional)',
    send: 'Enviar denuncia',
    cancel: 'Cancelar',
    sent: 'Gracias. La moderación lo va a revisar.',
    error_already_reported: 'Ya lo denunciaste; la moderación lo está revisando.',
    error_reports_limit: 'Llegaste al máximo de denuncias por hoy.',
    error_target_invalid: 'Eso ya no se puede denunciar.',
    error_report_invalid: 'Elige un motivo y escribe menos de 500 caracteres.',
    error_other: 'No se pudo completar. Revisa tu conexión y vuelve a intentar.',
  },
  en: {
    report: 'Report',
    reportAria: (what: string) => `Report ${what}`,
    formTitle: 'Report to moderation',
    reason: 'Reason',
    reason_spam: 'Spam or advertising',
    reason_abuse: 'Insults or harassment',
    reason_hate: 'Hate or discrimination',
    reason_cheating: 'Cheating or multiple accounts',
    reason_other: 'Other',
    details: 'Details (optional)',
    send: 'Send report',
    cancel: 'Cancel',
    sent: 'Thanks. Moderation will review it.',
    error_already_reported: 'You reported it already; moderation is reviewing it.',
    error_reports_limit: 'You reached the most reports for today.',
    error_target_invalid: 'That can no longer be reported.',
    error_report_invalid: 'Choose a reason and write under 500 characters.',
    error_other: 'It did not go through. Check your connection and try again.',
  },
});

/** What a sanctioned player reads at the top of every game screen. */
export const sanctionMessages = defineMessages({
  es: {
    warning: 'La moderación te dejó una advertencia.',
    mute: (until: string | null) =>
      until
        ? `Estás silenciado hasta el ${until}: no puedes enviar mensajes, publicar ni cambiar tu foto o tu descripción.`
        : 'Estás silenciado: no puedes enviar mensajes, publicar ni cambiar tu foto o tu descripción.',
    suspension: (until: string | null) =>
      until
        ? `Tu cuenta está suspendida hasta el ${until}: puedes mirar, pero no jugar.`
        : 'Tu cuenta está suspendida: puedes mirar, pero no jugar.',
    reason: (reason: string) => `Motivo: ${reason}.`,
    reason_spam: 'spam o publicidad',
    reason_abuse: 'insultos o acoso',
    reason_hate: 'odio o discriminación',
    reason_cheating: 'trampas',
    reason_multi_account: 'cuentas múltiples',
    reason_name: 'nombre inapropiado',
    reason_other: 'otro',
  },
  en: {
    warning: 'The moderators left you a warning.',
    mute: (until: string | null) =>
      until
        ? `You are muted until ${until}: you cannot send messages, publish or change your picture or description.`
        : 'You are muted: you cannot send messages, publish or change your picture or description.',
    suspension: (until: string | null) =>
      until
        ? `Your account is suspended until ${until}: you can look around, but not play.`
        : 'Your account is suspended: you can look around, but not play.',
    reason: (reason: string) => `Reason: ${reason}.`,
    reason_spam: 'spam or advertising',
    reason_abuse: 'insults or harassment',
    reason_hate: 'hate or discrimination',
    reason_cheating: 'cheating',
    reason_multi_account: 'multiple accounts',
    reason_name: 'inappropriate name',
    reason_other: 'other',
  },
});
