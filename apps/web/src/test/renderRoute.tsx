import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';

import { buildRouter } from '../router';

/** Renders the real route tree at `path` with a fresh query cache. */
export async function renderRoute(path: string): Promise<RenderResult> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = buildRouter(queryClient, createMemoryHistory({ initialEntries: [path] }));
  await router.load();
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}
