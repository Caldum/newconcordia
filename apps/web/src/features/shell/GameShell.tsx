import { Brand } from '@concordia/atlas/Brand';
import { Button } from '@concordia/atlas/Button';
import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { LanguageSwitch, useMessages } from '../../i18n';
import { signOut } from '../auth/api';

import { GameNav } from './GameNav';
import styles from './GameShell.module.css';
import { messages } from './messages';
import { PlayerStatus } from './PlayerStatus';
import { Wallet } from './Wallet';

/** The frame of the signed-in screens: the game bar (NavBar canvas) and the page. */
export function GameShell({ children }: { children: ReactNode }) {
  const copy = useMessages(messages);
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/" aria-label={copy.homeLabel} className={styles.brand}>
          <Brand size={30} />
        </Link>
        <GameNav />
        <div className={styles.tools}>
          <Wallet />
          <PlayerStatus />
          <LanguageSwitch />
          <Button
            variant="ghost"
            icon="logout"
            onClick={() => {
              void signOut();
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
