import { render, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LocaleProvider } from '../../i18n';

import { Turnstile } from './Turnstile';
import type { TurnstileApi, TurnstileHandle } from './Turnstile';

describe('Turnstile', () => {
  const original = window.turnstile;

  afterEach(() => {
    window.turnstile = original;
    document.head.querySelectorAll('script').forEach((script) => {
      script.remove();
    });
  });

  it('renders the widget with the site key, action and language, and passes tokens on', async () => {
    let options: Parameters<TurnstileApi['render']>[1] | undefined;
    const api: TurnstileApi = {
      render: vi.fn((_container: HTMLElement, given: Parameters<TurnstileApi['render']>[1]) => {
        options = given;
        return 'widget-7';
      }),
      reset: vi.fn(),
      remove: vi.fn(),
    };
    window.turnstile = api;
    const onToken = vi.fn();
    const ref = createRef<TurnstileHandle>();
    const { unmount } = render(
      <LocaleProvider initialLocale="en">
        <Turnstile ref={ref} action="signup" onToken={onToken} />
      </LocaleProvider>,
    );
    await waitFor(() => {
      expect(api.render).toHaveBeenCalled();
    });
    expect(options).toMatchObject({
      sitekey: '1x00000000000000000000AA',
      action: 'signup',
      language: 'en',
      appearance: 'always',
    });
    options?.callback('token-1');
    expect(onToken).toHaveBeenLastCalledWith('token-1');
    options?.['expired-callback']();
    expect(onToken).toHaveBeenLastCalledWith(null);
    options?.['error-callback']();
    ref.current?.reset();
    expect(api.reset).toHaveBeenCalledWith('widget-7');
    unmount();
    expect(api.remove).toHaveBeenCalledWith('widget-7');
  });

  it('loads Cloudflare’s script once and reports when it cannot', async () => {
    delete window.turnstile;
    const onUnavailable = vi.fn();
    render(
      <LocaleProvider initialLocale="es">
        <Turnstile action="login" onToken={vi.fn()} onUnavailable={onUnavailable} />
      </LocaleProvider>,
    );
    const script = document.head.querySelector('script');
    expect(script).toHaveAttribute(
      'src',
      'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
    );
    script?.dispatchEvent(new Event('error'));
    await waitFor(() => {
      expect(onUnavailable).toHaveBeenCalled();
    });
  });
});
