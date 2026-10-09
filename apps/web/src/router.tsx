import type { QueryClient } from '@tanstack/react-query';
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  lazyRouteComponent,
  Outlet,
} from '@tanstack/react-router';
import type { RouterHistory } from '@tanstack/react-router';

import { IndexPage } from './pages/home/IndexPage';
import { NotFoundPage } from './pages/not-found/NotFoundPage';

export interface RouterContext {
  queryClient: QueryClient;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: Outlet,
  notFoundComponent: NotFoundPage,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: IndexPage,
});

// Everything but the landing loads on demand; the map also brings its 0.9 MB geometry.
const mapRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/map',
  component: lazyRouteComponent(() => import('./pages/map/MapPage'), 'MapPage'),
});

const signUpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sign-up',
  component: lazyRouteComponent(() => import('./pages/sign-up/SignUpPage'), 'SignUpPage'),
});

const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sign-in',
  component: lazyRouteComponent(() => import('./pages/sign-in/SignInPage'), 'SignInPage'),
});

const verifyEmailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/verify-email',
  component: lazyRouteComponent(
    () => import('./pages/verify-email/VerifyEmailPage'),
    'VerifyEmailPage',
  ),
});

const recoverPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/recover-password',
  component: lazyRouteComponent(
    () => import('./pages/recover-password/RecoverPasswordPage'),
    'RecoverPasswordPage',
  ),
});

const recoverPasswordSentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/recover-password/sent',
  component: lazyRouteComponent(
    () => import('./pages/recover-password/RecoverPasswordSentPage'),
    'RecoverPasswordSentPage',
  ),
});

const newPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/new-password',
  component: lazyRouteComponent(
    () => import('./pages/new-password/NewPasswordPage'),
    'NewPasswordPage',
  ),
});

const authConfirmRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/confirm',
  component: lazyRouteComponent(
    () => import('./pages/auth-confirm/AuthConfirmPage'),
    'AuthConfirmPage',
  ),
});

const authCallbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/callback',
  component: lazyRouteComponent(
    () => import('./pages/auth-confirm/AuthCallbackPage'),
    'AuthCallbackPage',
  ),
});

const citizenRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/citizen',
  component: lazyRouteComponent(
    () => import('./pages/citizen/CreateCitizenPage'),
    'CreateCitizenPage',
  ),
});

const citizenshipRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/citizenship',
  // `welcome` shows the greeting the first time, right after the email is confirmed.
  validateSearch: (search: Record<string, unknown>): { welcome?: true } =>
    search.welcome === true || search.welcome === 'true' ? { welcome: true } : {},
  component: lazyRouteComponent(
    () => import('./pages/citizenship/CitizenshipPage'),
    'CitizenshipPage',
  ),
});

const changeCitizenshipRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/citizenship/change',
  component: lazyRouteComponent(
    () => import('./pages/citizenship/ChangeCitizenshipPage'),
    'ChangeCitizenshipPage',
  ),
});

const citizenshipRequestsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/citizenship/requests',
  component: lazyRouteComponent(
    () => import('./pages/citizenship/CitizenshipRequestsPage'),
    'CitizenshipRequestsPage',
  ),
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  mapRoute,
  signUpRoute,
  signInRoute,
  verifyEmailRoute,
  recoverPasswordRoute,
  recoverPasswordSentRoute,
  newPasswordRoute,
  authConfirmRoute,
  authCallbackRoute,
  citizenRoute,
  citizenshipRoute,
  changeCitizenshipRoute,
  citizenshipRequestsRoute,
]);

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
