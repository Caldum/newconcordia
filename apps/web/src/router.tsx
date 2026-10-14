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

// Every game screen: a signed-in citizen, inside the game bar (ADR 0019).
const gameRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'game',
  component: lazyRouteComponent(() => import('./features/shell/GameLayout'), 'GameLayout'),
});

const citizenshipRoute = createRoute({
  getParentRoute: () => gameRoute,
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
  getParentRoute: () => gameRoute,
  path: '/citizenship/change',
  component: lazyRouteComponent(
    () => import('./pages/citizenship/ChangeCitizenshipPage'),
    'ChangeCitizenshipPage',
  ),
});

const citizenshipRequestsRoute = createRoute({
  getParentRoute: () => gameRoute,
  path: '/citizenship/requests',
  component: lazyRouteComponent(
    () => import('./pages/citizenship/CitizenshipRequestsPage'),
    'CitizenshipRequestsPage',
  ),
});

const profileRoute = createRoute({
  getParentRoute: () => gameRoute,
  path: '/profile',
  component: lazyRouteComponent(() => import('./pages/profile/ProfilePage'), 'ProfilePage'),
});

const profileEditRoute = createRoute({
  getParentRoute: () => gameRoute,
  path: '/profile/edit',
  component: lazyRouteComponent(
    () => import('./pages/profile-edit/ProfileInfoPage'),
    'ProfileInfoPage',
  ),
});

const profileSecurityRoute = createRoute({
  getParentRoute: () => gameRoute,
  path: '/profile/edit/security',
  component: lazyRouteComponent(
    () => import('./pages/profile-edit/ProfileSecurityPage'),
    'ProfileSecurityPage',
  ),
});

const travelRoute = createRoute({
  getParentRoute: () => gameRoute,
  path: '/travel',
  component: lazyRouteComponent(() => import('./pages/travel/TravelPage'), 'TravelPage'),
});

const regimentsRoute = createRoute({
  getParentRoute: () => gameRoute,
  path: '/regiments',
  component: lazyRouteComponent(() => import('./pages/regiments/RegimentsPage'), 'RegimentsPage'),
});

const accountRoute = createRoute({
  getParentRoute: () => gameRoute,
  path: '/account',
  component: lazyRouteComponent(() => import('./pages/account/AccountPage'), 'AccountPage'),
});

const workRoute = createRoute({
  getParentRoute: () => gameRoute,
  path: '/work',
  component: lazyRouteComponent(() => import('./pages/work/WorkPage'), 'WorkPage'),
});

const companiesRoute = createRoute({
  getParentRoute: () => gameRoute,
  path: '/companies',
  component: lazyRouteComponent(() => import('./pages/companies/CompaniesPage'), 'CompaniesPage'),
});

const foundCompanyRoute = createRoute({
  getParentRoute: () => gameRoute,
  path: '/companies/new',
  component: lazyRouteComponent(
    () => import('./pages/companies/FoundCompanyPage'),
    'FoundCompanyPage',
  ),
});

const marketRoute = createRoute({
  getParentRoute: () => gameRoute,
  path: '/market',
  component: lazyRouteComponent(() => import('./pages/market/MarketPage'), 'MarketPage'),
});

const sellRoute = createRoute({
  getParentRoute: () => gameRoute,
  path: '/market/sell',
  component: lazyRouteComponent(() => import('./pages/market/SellPage'), 'SellPage'),
});

const licensesRoute = createRoute({
  getParentRoute: () => gameRoute,
  path: '/market/licenses',
  component: lazyRouteComponent(() => import('./pages/market/LicensesPage'), 'LicensesPage'),
});

const fxRoute = createRoute({
  getParentRoute: () => gameRoute,
  path: '/market/fx',
  component: lazyRouteComponent(() => import('./pages/fx/FxPage'), 'FxPage'),
});

const trainingRoute = createRoute({
  getParentRoute: () => gameRoute,
  path: '/training',
  component: lazyRouteComponent(() => import('./pages/training/TrainingPage'), 'TrainingPage'),
});

const hospitalRoute = createRoute({
  getParentRoute: () => gameRoute,
  path: '/hospital',
  component: lazyRouteComponent(() => import('./pages/hospital/HospitalPage'), 'HospitalPage'),
});

const battlesRoute = createRoute({
  getParentRoute: () => gameRoute,
  path: '/battles',
  component: lazyRouteComponent(() => import('./pages/battles/BattlesPage'), 'BattlesPage'),
});

const battleRoute = createRoute({
  getParentRoute: () => gameRoute,
  path: '/battles/$battleId',
  component: lazyRouteComponent(() => import('./pages/battles/BattlePage'), 'BattlePage'),
});

const notificationsRoute = createRoute({
  getParentRoute: () => gameRoute,
  path: '/notifications',
  component: lazyRouteComponent(
    () => import('./pages/notifications/NotificationsPage'),
    'NotificationsPage',
  ),
});

const pressRoute = createRoute({
  getParentRoute: () => gameRoute,
  path: '/press',
  component: lazyRouteComponent(() => import('./pages/press/PressPage'), 'PressPage'),
});

const messagesRoute = createRoute({
  getParentRoute: () => gameRoute,
  path: '/messages',
  component: lazyRouteComponent(() => import('./pages/messages/MessagesPage'), 'MessagesPage'),
});

const partiesRoute = createRoute({
  getParentRoute: () => gameRoute,
  path: '/parties',
  component: lazyRouteComponent(() => import('./pages/parties/PartiesPage'), 'PartiesPage'),
});

const electionsRoute = createRoute({
  getParentRoute: () => gameRoute,
  path: '/elections',
  component: lazyRouteComponent(() => import('./pages/elections/ElectionsPage'), 'ElectionsPage'),
});

const governmentRoute = createRoute({
  getParentRoute: () => gameRoute,
  path: '/government',
  component: lazyRouteComponent(
    () => import('./pages/government/GovernmentPage'),
    'GovernmentPage',
  ),
});

const lawsRoute = createRoute({
  getParentRoute: () => gameRoute,
  path: '/laws',
  component: lazyRouteComponent(() => import('./pages/laws/LawsPage'), 'LawsPage'),
});

const financesRoute = createRoute({
  getParentRoute: () => gameRoute,
  path: '/finances',
  component: lazyRouteComponent(() => import('./pages/finances/FinancesPage'), 'FinancesPage'),
});

const adminRoute = createRoute({
  getParentRoute: () => gameRoute,
  path: '/admin',
  component: lazyRouteComponent(() => import('./pages/admin/AdminPage'), 'AdminPage'),
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
  gameRoute.addChildren([
    citizenshipRoute,
    changeCitizenshipRoute,
    citizenshipRequestsRoute,
    profileRoute,
    profileEditRoute,
    profileSecurityRoute,
    regimentsRoute,
    travelRoute,
    accountRoute,
    workRoute,
    companiesRoute,
    foundCompanyRoute,
    marketRoute,
    sellRoute,
    licensesRoute,
    fxRoute,
    trainingRoute,
    notificationsRoute,
    pressRoute,
    messagesRoute,
    hospitalRoute,
    battlesRoute,
    battleRoute,
    partiesRoute,
    electionsRoute,
    governmentRoute,
    lawsRoute,
    financesRoute,
    adminRoute,
  ]),
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
