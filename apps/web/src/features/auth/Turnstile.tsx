import { useEffect, useEffectEvent, useImperativeHandle, useRef } from 'react';
import type { Ref } from 'react';

import { useLocale } from '../../i18n';
import { env } from '../../lib/env';

interface TurnstileOptions {
  sitekey: string;
  action: string;
  language: string;
  theme: 'light';
  appearance: 'always' | 'interaction-only';
  callback: (token: string) => void;
  'expired-callback': () => void;
  'error-callback': () => void;
}

export interface TurnstileApi {
  render: (container: HTMLElement, options: TurnstileOptions) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi | undefined;
  }
}

const scriptUrl = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let loading: Promise<TurnstileApi> | undefined;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;
    script.onload = () => {
      if (window.turnstile) resolve(window.turnstile);
      else reject(new Error('Turnstile did not load'));
    };
    script.onerror = () => {
      loading = undefined;
      reject(new Error('Turnstile did not load'));
    };
    document.head.append(script);
  });
  return loading;
}

export interface TurnstileHandle {
  /** Tokens are single use: ask for a new one after every attempt. */
  reset: () => void;
}

interface TurnstileProps {
  /** Shown in Cloudflare analytics: signup, login, recover. */
  action: string;
  /** Receives the token, or null when it expires or the check fails. */
  onToken: (token: string | null) => void;
  /** Called when the widget cannot load at all (blocked script, no network). */
  onUnavailable?: () => void;
  /** `interaction-only` stays hidden unless Cloudflare needs the visitor to act. */
  appearance?: 'always' | 'interaction-only';
  ref?: Ref<TurnstileHandle>;
}

/** Cloudflare Turnstile. The token goes to Supabase Auth, which verifies it with Cloudflare. */
export function Turnstile({
  action,
  onToken,
  onUnavailable,
  appearance = 'always',
  ref,
}: TurnstileProps) {
  const { locale } = useLocale();
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const tokenChanged = useEffectEvent((token: string | null) => {
    onToken(token);
  });
  const unavailable = useEffectEvent(() => {
    onUnavailable?.();
  });

  useImperativeHandle(ref, () => ({
    reset: () => {
      onToken(null);
      if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
    },
  }));

  useEffect(() => {
    let cancelled = false;
    loadTurnstile()
      .then((api) => {
        if (cancelled || !container.current) return;
        widgetId.current = api.render(container.current, {
          sitekey: env.VITE_TURNSTILE_SITE_KEY,
          action,
          language: locale,
          theme: 'light',
          appearance,
          callback: (token) => {
            tokenChanged(token);
          },
          'expired-callback': () => {
            tokenChanged(null);
          },
          'error-callback': () => {
            tokenChanged(null);
          },
        });
      })
      .catch(() => {
        if (!cancelled) unavailable();
      });
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [action, appearance, locale]);

  return <div ref={container} />;
}
