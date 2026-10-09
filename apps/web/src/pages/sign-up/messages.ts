import { defineMessages } from '../../i18n';

export const messages = defineMessages({
  es: {
    documentTitle: 'Crear cuenta · Concordia',
    storyTitle: 'Elige tu país y empieza hoy.',
    storyBody:
      'Al registrarte ya eres ciudadano. Los primeros 7 días tu daño cuenta a la mitad y todavía no votas en elecciones.',
    steps: 'Pasos del registro',
    stepData: 'Tus datos',
    stepEmail: 'Tu correo',
    title: 'Crea tu ciudadano',
    haveAccount: '¿Ya tienes cuenta?',
    signIn: 'Iniciar sesión',
    google: 'Usar Google',
    emailMissing: 'Escribe tu correo, por ejemplo camila@gmail.com.',
    passwordHint: 'Al menos 10 caracteres.',
    passwordShort: (missing: number) =>
      missing === 1
        ? 'Falta 1 carácter: usa al menos 10.'
        : `Faltan ${String(missing)} caracteres: usa al menos 10.`,
    passwordOk: 'Largo suficiente.',
    submit: 'Crear mi ciudadano',
    sending: 'Creando tu ciudadano…',
    fixErrors: 'Revisa los campos marcados para continuar.',
  },
  en: {
    documentTitle: 'Create account · Concordia',
    storyTitle: 'Choose your country and start today.',
    storyBody:
      'You are a citizen as soon as you sign up. In your first 7 days your damage counts at half and you cannot vote in elections yet.',
    steps: 'Sign-up steps',
    stepData: 'Your details',
    stepEmail: 'Your email',
    title: 'Create your citizen',
    haveAccount: 'Already have an account?',
    signIn: 'Sign in',
    google: 'Use Google',
    emailMissing: 'Write your email, for example camila@gmail.com.',
    passwordHint: 'At least 10 characters.',
    passwordShort: (missing: number) =>
      missing === 1
        ? '1 character missing: use at least 10.'
        : `${String(missing)} characters missing: use at least 10.`,
    passwordOk: 'Long enough.',
    submit: 'Create my citizen',
    sending: 'Creating your citizen…',
    fixErrors: 'Check the marked fields to continue.',
  },
});
