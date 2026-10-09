import { Steps } from '@concordia/atlas/Steps';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';

import styles from '../../features/auth/AuthForm.module.css';
import { AuthLayout } from '../../features/auth/AuthLayout';
import { emailRedirectTo } from '../../features/auth/emailRedirect';
import { SignedOutOnly } from '../../features/auth/guards';
import { ResendEmail } from '../../features/auth/ResendEmail';
import { readSignupDraft } from '../../features/auth/signupDraft';
import { Story } from '../../features/auth/Story';
import { defineMessages, useMessages } from '../../i18n';
import { supabase } from '../../lib/supabase';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

const messages = defineMessages({
  es: {
    documentTitle: 'Confirma tu correo · Concordia',
    storyTitle: 'Todo está listo.',
    storyBody: 'Confirma tu correo y empieza tu vida en Concordia.',
    steps: 'Pasos del registro',
    stepData: 'Tus datos',
    stepEmail: 'Tu correo',
    title: 'Confirma tu correo',
    sentTo: 'Te enviamos un enlace a',
    sentToEnd: '. Ábrelo desde la computadora o el celular. Vence en 30 minutos.',
    sentGeneric: 'Te enviamos un enlace a tu correo. Ábrelo desde la computadora o el celular.',
    wrongAddress: '¿Escribiste mal la dirección?',
    fix: 'Corrígela',
    fixEnd: 'sin perder lo que completaste.',
    spam: '¿No aparece? Busca en correo no deseado o en promociones.',
  },
  en: {
    documentTitle: 'Confirm your email · Concordia',
    storyTitle: 'Everything is ready.',
    storyBody: 'Confirm your email and start your life in Concordia.',
    steps: 'Sign-up steps',
    stepData: 'Your details',
    stepEmail: 'Your email',
    title: 'Confirm your email',
    sentTo: 'We sent a link to',
    sentToEnd: '. Open it on your computer or your phone. It expires in 30 minutes.',
    sentGeneric: 'We sent a link to your email. Open it on your computer or your phone.',
    wrongAddress: 'Did you mistype the address?',
    fix: 'Fix it',
    fixEnd: 'without losing what you filled in.',
    spam: 'Not there? Look in spam or promotions.',
  },
});

export function VerifyEmailPage() {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);
  const [draft] = useState(() => readSignupDraft());

  return (
    <SignedOutOnly>
      <AuthLayout story={<Story title={copy.storyTitle}>{copy.storyBody}</Story>}>
        <div className={styles.form}>
          <Steps label={copy.steps} steps={[copy.stepData, copy.stepEmail]} current={1} />
          <div className={styles.heading}>
            <h1 className="at-title-1">{copy.title}</h1>
            {draft ? (
              <p>
                {copy.sentTo} <span className={styles.address}>{draft.email}</span>
                {copy.sentToEnd}
              </p>
            ) : (
              <p>{copy.sentGeneric}</p>
            )}
          </div>
          {draft ? (
            <ResendEmail
              send={(captchaToken) =>
                supabase.auth.resend({
                  type: 'signup',
                  email: draft.email,
                  options: {
                    captchaToken,
                    emailRedirectTo: emailRedirectTo(),
                  },
                })
              }
            />
          ) : null}
          <p className={styles.aside}>{copy.spam}</p>
          <p className={styles.aside}>
            {copy.wrongAddress} <Link to="/sign-up">{copy.fix}</Link> {copy.fixEnd}
          </p>
        </div>
      </AuthLayout>
    </SignedOutOnly>
  );
}
