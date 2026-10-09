import type { Page } from '@playwright/test';

/** The token Cloudflare's test site keys produce; the test secret accepts it. */
export const dummyTurnstileToken = 'XXXX.DUMMY.TOKEN.XXXX';

/**
 * Serves a stand-in for Cloudflare's widget script, so journeys do not depend on challenges.cloudflare.com
 * being reachable from the browser. Auth still verifies the token with Cloudflare's test secret.
 */
export async function stubTurnstile(page: Page): Promise<void> {
  await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js*', (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `window.turnstile = {
        render(container, options) {
          setTimeout(() => options.callback(${JSON.stringify(dummyTurnstileToken)}), 0);
          return 'stub-widget';
        },
        reset() {},
        remove() {},
      };`,
    }),
  );
}
