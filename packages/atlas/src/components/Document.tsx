import type { ReactNode } from 'react';

import { cx } from '../cx';

import styles from './Document.module.css';

export interface DocumentField {
  label: string;
  value: ReactNode;
  /** How the value is set: the citizen's name, a figure, a place name or plain text. */
  kind?: 'name' | 'number' | 'place' | 'text';
}

interface DocumentProps {
  /** «Documento de ciudadanía». */
  heading: string;
  /** Official country name, set as a place name: «República Argentina». */
  country: string;
  /** Country Silhouette with the player's region highlighted. */
  silhouette: ReactNode;
  fields: readonly DocumentField[];
  /** Play the single entrance animation (when the email has just been confirmed). */
  animate?: boolean;
}

const valueClass = {
  name: cx(styles.name),
  number: cx(styles.number, 'at-figure'),
  place: cx(styles.place, 'at-place'),
  text: '',
};

/** The citizenship document the country hands over when the email is confirmed. */
export function Document({ heading, country, silhouette, fields, animate = false }: DocumentProps) {
  return (
    <article
      className={cx(styles.document, animate && styles.enter)}
      aria-label={`${heading}, ${country}`}
    >
      <header className={styles.head}>
        <h2 className={styles.heading}>{heading}</h2>
        <span className={cx(styles.country, 'at-place')}>{country}</span>
      </header>
      <div className={styles.body}>
        <div className={styles.silhouette}>{silhouette}</div>
        <dl className={styles.fields}>
          {fields.map((field) => (
            <div key={field.label} className={field.kind === 'name' ? styles.wide : undefined}>
              <dt>{field.label}</dt>
              <dd className={valueClass[field.kind ?? 'text']}>{field.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </article>
  );
}
