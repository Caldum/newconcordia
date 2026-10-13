import { Outlet } from '@tanstack/react-router';

import { CitizenOnly } from './CitizenOnly';
import { GameShell } from './GameShell';

/** Layout route of every game screen: a citizen is required, inside the game bar. */
export function GameLayout() {
  return (
    <CitizenOnly>
      <GameShell>
        <Outlet />
      </GameShell>
    </CitizenOnly>
  );
}
