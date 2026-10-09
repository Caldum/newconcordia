import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';

import { AuthProvider } from '../features/auth/AuthProvider';
import { LocaleProvider } from '../i18n';
import type { Locale } from '../i18n';
import { buildRouter } from '../router';

/** Renders the real route tree at `path` with a fresh query cache, in Spanish unless told otherwise. */
export async function renderRoute(path: string, locale: Locale = 'es'): Promise<RenderResult> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = buildRouter(queryClient, createMemoryHistory({ initialEntries: [path] }));
  await router.load();
  return render(
    <LocaleProvider initialLocale={locale}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>
    </LocaleProvider>,
  );
}
