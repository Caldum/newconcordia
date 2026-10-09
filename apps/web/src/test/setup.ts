import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach } from 'vitest';

// Screens load lazily and answer through mocked queries; give CI machines some slack.
configure({ asyncUtilTimeout: 3000 });

afterEach(() => {
  cleanup();
});

// jsdom does not implement scrolling; the router restores scroll on navigation.
if (typeof window !== 'undefined') window.scrollTo = () => undefined;

// jsdom has no matchMedia; components ask it about reduced motion.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    value: (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  });
}

// Turnstile comes from Cloudflare at runtime; tests get a widget that answers with a token at once.
if (typeof window !== 'undefined') {
  window.turnstile = {
    render: (_container, options) => {
      queueMicrotask(() => {
        options.callback('turnstile-test-token');
      });
      return 'turnstile-test-widget';
    },
    reset: () => undefined,
    remove: () => undefined,
  };
}
