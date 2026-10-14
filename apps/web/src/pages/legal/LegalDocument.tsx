import { Note } from '@concordia/atlas/Note';
import { Link } from '@tanstack/react-router';

import { useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import styles from './LegalDocument.module.css';
import { messages } from './messages';

interface LegalDocumentProps {
  title: string;
  /** The version in force; hidden until it loads. */
  version: number | undefined;
  sections: readonly { title: string; body: string }[];
}

/** A legal text: its title, the version in force and its sections. */
export function LegalDocument({ title, version, sections }: LegalDocumentProps) {
  const copy = useMessages(messages);
  useDocumentTitle(`${title} · Concordia`);
  return (
    <main className={styles.main}>
      <h1 className="at-title-1">{title}</h1>
      {version ? <p className={styles.version}>{copy.version(version)}</p> : null}
      <Note tone="info">{copy.draft}</Note>
      {sections.map((section) => (
        <section key={section.title} className={styles.section}>
          <h2 className="at-title-3">{section.title}</h2>
          <p>{section.body}</p>
        </section>
      ))}
      <Link to="/">{copy.back}</Link>
    </main>
  );
}
