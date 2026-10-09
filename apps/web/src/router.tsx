import type { QueryClient } from '@tanstack/react-query';
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  lazyRouteComponent,
  Outlet,
} from '@tanstack/react-router';
import type { RouterHistory } from '@tanstack/react-router';

import { HomePage } from './pages/home/HomePage';
import { NotFoundPage } from './pages/not-found/NotFoundPage';

export interface RouterContext {
  queryClient: QueryClient;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: Outlet,
  notFoundComponent: NotFoundPage,
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});

// The map and its 0.9 MB geometry load only when the map is opened.
const mapRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/map',
  component: lazyRouteComponent(() => import('./pages/map/MapPage'), 'MapPage'),
});

const routeTree = rootRoute.addChildren([homeRoute, mapRoute]);

export function buildRouter(queryClient: QueryClient, history?: RouterHistory) {
  return createRouter({
    routeTree,
    context: { queryClient },
    ...(history ? { history } : {}),
    defaultPreload: 'intent',
    scrollRestoration: true,
  });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof buildRouter>;
  }
}
