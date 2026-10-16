import { Note } from '@concordia/atlas/Note';
import { Link, useParams } from '@tanstack/react-router';

import { useCitizenRecord } from '../../features/admin/queries';
import { useMessages } from '../../i18n';

import styles from './AdminPage.module.css';
import { CitizenAccount } from './CitizenAccount';
import { CitizenArticles } from './CitizenArticles';
import { CitizenBelongings } from './CitizenBelongings';
import { citizenMessages } from './citizenMessages';
import { CitizenNotes } from './CitizenNotes';
import { CitizenProfileTools } from './CitizenProfileTools';
import { CitizenReports } from './CitizenReports';
import { CitizenSignals } from './CitizenSignals';
import { ConsolePage } from './ConsolePage';
import { SanctionForm } from './SanctionForm';
import { SanctionHistory } from './SanctionHistory';

/** `/admin/citizens/$name`: a citizen's record and every moderation tool on them. */
export function CitizenPage() {
  const copy = useMessages(citizenMessages);
  const { name } = useParams({ from: '/console/admin/citizens/$name' });
  const record = useCitizenRecord(name);
  const notFound =
    record.isError && (record.error as { message?: string }).message === 'citizen_not_found';

  return (
    <ConsolePage
      title={copy.recordTitle(name)}
      aside={<Link to="/admin/citizens">{copy.backToSearch}</Link>}
    >
      {notFound ? <Note tone="info">{copy.notFound}</Note> : null}
      {record.isError && !notFound ? <Note tone="error">{copy.loadFailed}</Note> : null}
      {record.data ? (
        <>
          <div className={styles.columns}>
            <CitizenAccount record={record.data} />
            <SanctionForm name={record.data.name} />
          </div>
          <SanctionHistory sanctions={record.data.sanctions} />
          <div className={styles.columns}>
            <CitizenProfileTools record={record.data} />
            <CitizenBelongings record={record.data} />
          </div>
          <CitizenArticles articles={record.data.articles} />
          <div className={styles.columns}>
            <CitizenReports record={record.data} />
            <CitizenNotes record={record.data} />
          </div>
          <CitizenSignals signals={record.data.signals} />
        </>
      ) : null}
    </ConsolePage>
  );
}
