import { Button } from '@concordia/atlas/Button';
import { useEffect, useRef, useState } from 'react';

import { defineMessages, useMessages } from '../../i18n';

import { authProblem } from './authErrors';
import type { AuthProblem } from './authErrors';
import { authMessages } from './messages';
import { Turnstile } from './Turnstile';
import type { TurnstileHandle } from './Turnstile';

/** Seconds before another email can be requested; Auth enforces its own limit as well. */
export const resendCooldownSeconds = 60;

const messages = defineMessages({
  es: {
    wait: (seconds: number) => `¿No llegó? Puedes pedir otro en ${String(seconds)} s.`,
    ready: '¿No llegó?',
    resend: 'Enviar otro correo',
    sent: 'Te enviamos otro correo.',
  },
  en: {
    wait: (seconds: number) => `Not there? You can ask for another in ${String(seconds)} s.`,
    ready: 'Not there?',
    resend: 'Send another email',
    sent: 'We sent you another email.',
  },
});

interface ResendEmailProps {
  /** Sends the email again with a fresh Turnstile token. */
  send: (captchaToken: string) => Promise<{ error: unknown }>;
}

/** «¿No llegó?» with a countdown, then a button to send the email again. */
export function ResendEmail({ send }: ResendEmailProps) {
  const copy = useMessages(messages);
  const shared = useMessages(authMessages);
  const [secondsLeft, setSecondsLeft] = useState(resendCooldownSeconds);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [problem, setProblem] = useState<AuthProblem | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const turnstile = useRef<TurnstileHandle>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => {
      setSecondsLeft((current) => current - 1);
    }, 1000);
    return () => {
      clearTimeout(timer);
    };
  }, [secondsLeft]);

  const resend = async () => {
    if (!token) {
      setProblem('captcha');
      return;
    }
    setStatus('sending');
    setProblem(null);
    const { error } = await send(token);
    turnstile.current?.reset();
    if (error) {
      setProblem(authProblem(error));
      setStatus('idle');
      return;
    }
    setStatus('sent');
    setSecondsLeft(resendCooldownSeconds);
  };

  return (
    <div>
      <p className="at-support" role="status">
        {status === 'sent' ? `${copy.sent} ` : ''}
        {secondsLeft > 0 ? copy.wait(secondsLeft) : copy.ready}
      </p>
      {secondsLeft <= 0 ? (
        <>
          <Turnstile
            ref={turnstile}
            action="resend"
            appearance="interaction-only"
            onToken={setToken}
            onUnavailable={() => {
              setUnavailable(true);
            }}
          />
          <Button
            variant="secondary"
            disabled={status === 'sending'}
            onClick={() => {
              void resend();
            }}
          >
            {copy.resend}
          </Button>
        </>
      ) : null}
      {unavailable ? <p role="alert">{shared.turnstileUnavailable}</p> : null}
      {problem ? <p role="alert">{shared.problem(problem)}</p> : null}
    </div>
  );
}
