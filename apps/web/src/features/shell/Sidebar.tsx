import { useMessages } from '../../i18n';

import { messages } from './messages';
import styles from './Sidebar.module.css';
import { SidebarEnergy } from './SidebarEnergy';
import { SidebarIdentity } from './SidebarIdentity';
import { SidebarLocation } from './SidebarLocation';
import { SidebarMoney } from './SidebarMoney';

/** The player at a glance beside every game screen: who they are, their inbox, where they are, energy and money. */
export function Sidebar() {
  const copy = useMessages(messages);
  return (
    <aside aria-label={copy.sidebar} className={styles.sidebar}>
      <SidebarIdentity />
      <SidebarLocation />
      <SidebarEnergy />
      <SidebarMoney />
    </aside>
  );
}
