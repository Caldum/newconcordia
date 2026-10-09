import { Brand } from '@concordia/atlas/Brand';
import { Button } from '@concordia/atlas/Button';
import { CreditIcon, GoldIcon } from '@concordia/atlas/GameIcons';
import { EnergyMeter } from '@concordia/atlas/Track';
import { Link, Navigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { defineMessages, formatMoney, LanguageSwitch, useLocale, useMessages } from '../../i18n';
import { supabase } from '../../lib/supabase';
import { useIsAdmin } from '../admin/queries';
import { useAuth } from '../auth/AuthProvider';
import { useCitizen } from '../auth/useCitizen';
import type { Citizen } from '../auth/useCitizen';
import { useBalances } from '../ledger/queries';
import { initials } from '../profile/initials';
import { useEnergy, useProfile } from '../profile/useProfile';
import type { Profile } from '../profile/useProfile';

import styles from './GameShell.module.css';

const messages = defineMessages({
  es: {
    homeLabel: 'Concordia, ir al inicio',
    nav: 'Principal',
    home: 'Inicio',
    map: 'Mapa',
    economy: 'Economía',
    citizenship: 'Ciudadanía',
    admin: 'Administración',
    signOut: 'Cerrar sesión',
    energy: 'Energía',
    energyValue: (energy: number, max: number) => `${String(energy)} de ${String(max)}`,
    recharge: (perHour: number) => `Se recarga ${String(perHour)} por hora`,
    profile: (name: string) => `Tu perfil: ${name}`,
    account: (gold: string, credit: string) => `Tu cuenta: Oro ${gold} y Crédito ${credit}`,
    loadFailed: 'No se pudo cargar tu ciudadano. Recarga la página para intentar de nuevo.',
  },
  en: {
    homeLabel: 'Concordia, go to home',
    nav: 'Main',
    home: 'Home',
    map: 'Map',
    economy: 'Economy',
    citizenship: 'Citizenship',
    admin: 'Administration',
    signOut: 'Sign out',
    energy: 'Energy',
    energyValue: (energy: number, max: number) => `${String(energy)} of ${String(max)}`,
    recharge: (perHour: number) => `Recharges ${String(perHour)} per hour`,
    profile: (name: string) => `Your profile: ${name}`,
    account: (gold: string, credit: string) => `Your account: Gold ${gold} and Credit ${credit}`,
    loadFailed: 'Your citizen did not load. Reload the page to try again.',
  },
});

/** The frame of the signed-in screens: the game bar (NavBar canvas) and the page. */
export function GameShell({ children }: { children: ReactNode }) {
  const copy = useMessages(messages);
  const isAdmin = useIsAdmin();
  const profile = useProfile();
  const linkProps = { activeProps: { 'aria-current': 'page' as const } };
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/" aria-label={copy.homeLabel} className={styles.brand}>
          <Brand size={30} />
        </Link>
        <nav aria-label={copy.nav} className={styles.nav}>
          <Link to="/" activeOptions={{ exact: true }} {...linkProps}>
            {copy.home}
          </Link>
          <Link to="/map" {...linkProps}>
            {copy.map}
          </Link>
          <Link to="/work" {...linkProps}>
            {copy.economy}
          </Link>
          <Link to="/citizenship" {...linkProps}>
            {copy.citizenship}
          </Link>
          {isAdmin.data ? (
            <Link to="/admin" {...linkProps}>
              {copy.admin}
            </Link>
          ) : null}
        </nav>
        <div className={styles.tools}>
          <Wallet />
          {profile.data ? <PlayerStatus profile={profile.data} /> : null}
          <LanguageSwitch />
          <Button
            variant="ghost"
            icon="logout"
            onClick={() => {
              void supabase.auth.signOut();
            }}
          >
            {copy.signOut}
          </Button>
        </div>
      </header>
      {children}
    </div>
  );
}

/** Gold and the Credit of the player's country, linking to the account. Hidden until they load. */
function Wallet() {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const balances = useBalances();
  const [gold, credit] = balances.data ?? [];
  if (!gold || !credit) return null;
  const goldText = formatMoney(gold.balance, locale, { whole: true });
  const creditText = formatMoney(credit.balance, locale, { whole: true });
  return (
    <Link to="/account" aria-label={copy.account(goldText, creditText)} className={styles.wallet}>
      <span>
        <GoldIcon />
        {goldText}
      </span>
      <span className={styles.walletSeparator} aria-hidden="true" />
      <span>
        <CreditIcon />
        {creditText}
      </span>
    </Link>
  );
}

/** Energy and the way to the profile. Hidden while the profile loads or if it fails. */
function PlayerStatus({ profile }: { profile: Profile }) {
  const copy = useMessages(messages);
  const energy = useEnergy(profile.energyReading) ?? profile.energy;
  return (
    <>
      <span className={styles.chip} title={copy.recharge(profile.energy_per_hour)}>
        <EnergyMeter
          value={energy}
          max={profile.energy_max}
          label={copy.energy}
          valueText={copy.energyValue(energy, profile.energy_max)}
        />
      </span>
      <Link to="/profile" aria-label={copy.profile(profile.name)} className={styles.avatar}>
        <span aria-hidden="true">{initials(profile.name)}</span>
      </Link>
    </>
  );
}

/** Renders its children only for a signed-in player with a citizen; sends everyone else on. */
export function CitizenOnly({ children }: { children: (citizen: Citizen) => ReactNode }) {
  const copy = useMessages(messages);
  const auth = useAuth();
  const citizen = useCitizen();
  if (auth.status === 'loading') return null;
  if (auth.status === 'signedOut') return <Navigate to="/sign-in" replace />;
  if (citizen.isPending) return null;
  if (citizen.isError) {
    return (
      <main className={styles.problem}>
        <p role="alert">{copy.loadFailed}</p>
      </main>
    );
  }
  if (!citizen.data) return <Navigate to="/citizen" replace />;
  return children(citizen.data);
}
