import { Brand } from '@concordia/atlas/Brand';
import { Button } from '@concordia/atlas/Button';
import { Link, Navigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { defineMessages, LanguageSwitch, useMessages } from '../../i18n';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../auth/AuthProvider';
import { useCitizen } from '../auth/useCitizen';
import type { Citizen } from '../auth/useCitizen';

import styles from './GameShell.module.css';

const messages = defineMessages({
  es: {
    homeLabel: 'Concordia, ir al inicio',
    nav: 'Principal',
    home: 'Inicio',
    map: 'Mapa',
    citizenship: 'Ciudadanía',
    signOut: 'Cerrar sesión',
    loadFailed: 'No se pudo cargar tu ciudadano. Recarga la página para intentar de nuevo.',
  },
  en: {
    homeLabel: 'Concordia, go to home',
    nav: 'Main',
    home: 'Home',
    map: 'Map',
    citizenship: 'Citizenship',
    signOut: 'Sign out',
    loadFailed: 'Your citizen did not load. Reload the page to try again.',
  },
});

/** The frame of the signed-in screens until the game bar arrives (D08). */
export function GameShell({ children }: { children: ReactNode }) {
  const copy = useMessages(messages);
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
          <Link to="/citizenship" {...linkProps}>
            {copy.citizenship}
          </Link>
        </nav>
        <div className={styles.tools}>
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
