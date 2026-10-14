import { defineMessages } from '../../i18n';
import type { Locale } from '../../i18n';

interface Section {
  title: string;
  body: string;
}

const termsEs: readonly Section[] = [
  {
    title: 'Tu cuenta',
    body: 'Una persona, una cuenta y un ciudadano. Eres responsable de lo que se haga con tu cuenta; no la compartas ni la vendas.',
  },
  {
    title: 'Juego limpio',
    body: 'No se permiten las cuentas múltiples, los programas que jueguen por ti ni el aprovechamiento de errores. Si encuentras un error, avísanos. Revisamos señales de abuso y podemos revertir lo que se haya obtenido con trampas.',
  },
  {
    title: 'Lo que publicas',
    body: 'Tus artículos, tu descripción y tus fotos son públicos; los mensajes privados solo los leen tú y quien los recibe, salvo que alguien los denuncie. No publiques insultos, odio, spam ni datos personales de otras personas. La moderación puede ocultar lo que incumpla estas reglas.',
  },
  {
    title: 'Sanciones',
    body: 'Según la gravedad, podemos ocultar contenido, limitar acciones o cerrar cuentas. Cada acción de moderación queda registrada.',
  },
];

const termsEn: readonly Section[] = [
  {
    title: 'Your account',
    body: 'One person, one account, one citizen. You are responsible for what is done with your account; do not share or sell it.',
  },
  {
    title: 'Fair play',
    body: 'Multiple accounts, programs that play for you and exploiting bugs are not allowed. If you find a bug, tell us. We review abuse signals and may reverse what was gained by cheating.',
  },
  {
    title: 'What you publish',
    body: 'Your articles, description and pictures are public; private messages are read only by you and their recipient, unless someone reports them. Do not publish insults, hate, spam or other people’s personal data. Moderation may hide what breaks these rules.',
  },
  {
    title: 'Sanctions',
    body: 'Depending on how serious it is, we may hide content, limit actions or close accounts. Every moderation action is recorded.',
  },
];

const privacyEs: readonly Section[] = [
  {
    title: 'Qué guardamos',
    body: 'Tu correo y tu contraseña (cifrada, la gestiona Supabase Auth), tu nombre de ciudadano, país e idioma, lo que haces en el juego, y de cada sesión la dirección IP y el navegador, que usamos para detectar abusos.',
  },
  {
    title: 'Qué es público',
    body: 'Tu nombre de ciudadano, tu país, tu nivel y rango, tu foto, tu descripción, tus artículos y tus cargos. Tu correo nunca se muestra.',
  },
  {
    title: 'Con quién trabajamos',
    body: 'Supabase (base de datos y cuentas), Cloudflare (sitio y verificación anti-bots), Resend (correos), Sentry (errores) y, si la eliges, Google para iniciar sesión.',
  },
  {
    title: 'Tus derechos',
    body: 'Puedes cambiar tu correo, tu contraseña, tu foto y tu descripción desde tu perfil, y pedir una copia o el borrado de tus datos. El contacto y los plazos se publican con la versión definitiva de esta política.',
  },
];

const privacyEn: readonly Section[] = [
  {
    title: 'What we keep',
    body: 'Your email and password (hashed, handled by Supabase Auth), your citizen name, country and language, what you do in the game, and for each session the IP address and browser, which we use to detect abuse.',
  },
  {
    title: 'What is public',
    body: 'Your citizen name, country, level and rank, picture, description, articles and offices. Your email is never shown.',
  },
  {
    title: 'Who we work with',
    body: 'Supabase (database and accounts), Cloudflare (site and bot check), Resend (emails), Sentry (errors) and, if you choose it, Google to sign in.',
  },
  {
    title: 'Your rights',
    body: 'You can change your email, password, picture and description from your profile, and ask for a copy or the deletion of your data. The contact and deadlines are published with the final version of this policy.',
  },
];

export const messages = defineMessages({
  es: {
    termsTitle: 'Términos y condiciones',
    privacyTitle: 'Política de privacidad',
    version: (version: number) => `Versión ${String(version)}`,
    draft:
      'Borrador: este texto resume las reglas del juego y se reemplaza por la versión revisada legalmente antes de la beta pública.',
    back: 'Volver a Concordia',
  },
  en: {
    termsTitle: 'Terms and conditions',
    privacyTitle: 'Privacy policy',
    version: (version: number) => `Version ${String(version)}`,
    draft:
      'Draft: this text sums up the rules of the game and is replaced by the legally reviewed version before the public beta.',
    back: 'Back to Concordia',
  },
});

/** The sections of each document, per language (draft until the owner's reviewed texts, PD-14). */
export const legalSections: Readonly<
  Record<Locale, { terms: readonly Section[]; privacy: readonly Section[] }>
> = {
  es: { terms: termsEs, privacy: privacyEs },
  en: { terms: termsEn, privacy: privacyEn },
};
