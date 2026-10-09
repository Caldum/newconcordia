import { defineMessages } from '../../i18n';

import type { AuthProblem } from './authErrors';

const problemsEs: Record<AuthProblem, string> = {
  invalidCredentials: 'El correo o la contraseña no coinciden. Revísalos o recupera tu contraseña.',
  emailNotConfirmed: 'Todavía no confirmaste tu correo. Abre el enlace que te enviamos.',
  weakPassword:
    'Esa contraseña es fácil de adivinar. Usa al menos 10 caracteres y mezcla palabras.',
  samePassword: 'La contraseña nueva tiene que ser distinta de la anterior.',
  captcha: 'No se completó la verificación de seguridad. Espera a que termine y vuelve a intentar.',
  rateLimit: 'Hiciste muchos intentos seguidos. Espera unos minutos y vuelve a intentar.',
  linkExpired: 'El enlace venció o ya se usó. Pide uno nuevo.',
  emailInvalid: 'Revisa el correo: falta algo, por ejemplo camila@gmail.com.',
  signupRejected: 'No pudimos crear tu ciudadano. Revisa el nombre y el país y vuelve a intentar.',
  network: 'No hay conexión con Concordia. Revisa tu internet y vuelve a intentar.',
  unknown: 'Algo falló de nuestro lado. Vuelve a intentar en unos minutos.',
};

const problemsEn: Record<AuthProblem, string> = {
  invalidCredentials: 'The email or password does not match. Check them or reset your password.',
  emailNotConfirmed: 'You have not confirmed your email yet. Open the link we sent you.',
  weakPassword: 'That password is easy to guess. Use at least 10 characters and mix words.',
  samePassword: 'The new password has to be different from the old one.',
  captcha: 'The security check did not finish. Wait for it and try again.',
  rateLimit: 'You made many attempts in a row. Wait a few minutes and try again.',
  linkExpired: 'The link expired or was already used. Ask for a new one.',
  emailInvalid: 'Check the email: something is missing, for example camila@gmail.com.',
  signupRejected: 'We could not create your citizen. Check the name and country and try again.',
  network: 'There is no connection to Concordia. Check your internet and try again.',
  unknown: 'Something failed on our side. Try again in a few minutes.',
};

/** Copy shared by every account screen. */
export const authMessages = defineMessages({
  es: {
    backHome: 'Volver al inicio',
    homeLabel: 'Concordia, ir al inicio',
    google: 'Continuar con Google',
    orWithEmail: 'o con tu correo',
    email: 'Correo',
    password: 'Contraseña',
    showPassword: 'Mostrar',
    hidePassword: 'Ocultar',
    showPasswordLabel: 'Mostrar la contraseña',
    turnstileUnavailable:
      'No cargó la verificación de seguridad. Desactiva el bloqueador de contenido para Concordia o prueba con otro navegador.',
    problem: (problem: AuthProblem) => problemsEs[problem],
  },
  en: {
    backHome: 'Back to home',
    homeLabel: 'Concordia, go to home',
    google: 'Continue with Google',
    orWithEmail: 'or with your email',
    email: 'Email',
    password: 'Password',
    showPassword: 'Show',
    hidePassword: 'Hide',
    showPasswordLabel: 'Show the password',
    turnstileUnavailable:
      'The security check did not load. Turn off the content blocker for Concordia or try another browser.',
    problem: (problem: AuthProblem) => problemsEn[problem],
  },
});
