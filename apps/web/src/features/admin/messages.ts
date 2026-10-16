import { defineMessages } from '../../i18n';

/** The console's frame: bar, navigation, the staff guard and the shared refusals of its actions. */
export const consoleMessages = defineMessages({
  es: {
    tag: 'Administración',
    homeLabel: 'Resumen de la administración',
    nav: 'Administración',
    overview: 'Resumen',
    reports: 'Denuncias',
    citizens: 'Ciudadanos',
    sanctions: 'Sanciones',
    gold: 'Precios en oro',
    params: 'Parámetros',
    economy: 'Economía',
    world: 'Mundo',
    access: 'Acceso',
    log: 'Registro',
    role_admin: 'Administración',
    role_moderator: 'Moderación',
    signOut: 'Salir',
    loadFailed: 'No se pudo cargar la administración. Recarga la página para intentar de nuevo.',
    notStaffTitle: 'Esta cuenta no es del equipo',
    notStaffBody:
      'La administración usa cuentas propias, que no juegan. Sal y entra con tu cuenta del equipo.',
    toGame: 'Ir al juego',
    adminOnly: 'Esta sección es solo para quienes administran el juego.',
    goldAmount: (amount: string) => `${amount} Oro`,
  },
  en: {
    tag: 'Administration',
    homeLabel: 'Administration overview',
    nav: 'Administration',
    overview: 'Overview',
    reports: 'Reports',
    citizens: 'Citizens',
    sanctions: 'Sanctions',
    gold: 'GOLD prices',
    params: 'Parameters',
    economy: 'Economy',
    world: 'World',
    access: 'Access',
    log: 'Log',
    role_admin: 'Administration',
    role_moderator: 'Moderation',
    signOut: 'Sign out',
    loadFailed: 'The administration did not load. Reload the page to try again.',
    notStaffTitle: 'This account is not on the team',
    notStaffBody:
      'The administration uses its own accounts, which do not play. Sign out and sign in with your team account.',
    toGame: 'Go to the game',
    adminOnly: 'This section is only for those who administer the game.',
    goldAmount: (amount: string) => `${amount} Gold`,
  },
});

/** Refusals any console action can get; a page's own catalog wins on the same code. */
export const consoleErrors = defineMessages({
  es: {
    error_not_staff: 'Tu cuenta ya no es del equipo.',
    error_not_admin: 'Solo quienes administran el juego pueden hacer esto.',
    error_admin_only: 'Esto lo decide alguien de administración.',
    error_reason_required: 'Escribe el motivo (entre 3 y 300 caracteres). Queda en el registro.',
    error_note_invalid: 'Escribe una nota de 3 caracteres o más.',
    error_no_change: 'No hay nada que cambiar.',
    error_citizen_not_found: 'No hay ningún ciudadano con ese nombre.',
    error_other: 'No se pudo hacer. Vuelve a intentar en un momento.',
  },
  en: {
    error_not_staff: 'Your account is no longer on the team.',
    error_not_admin: 'Only those who administer the game can do this.',
    error_admin_only: 'Someone from the administration decides this.',
    error_reason_required: 'Write the reason (3 to 300 characters). It goes into the log.',
    error_note_invalid: 'Write a note of 3 characters or more.',
    error_no_change: 'There is nothing to change.',
    error_citizen_not_found: 'There is no citizen with that name.',
    error_other: 'That did not work. Try again in a moment.',
  },
});
