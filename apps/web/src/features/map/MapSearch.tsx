import { useId, useState } from 'react';
import type { KeyboardEvent } from 'react';

import styles from './MapSearch.module.css';

export interface SearchOption {
  /** Shape or country id to select. */
  id: string;
  name: string;
  /** «País» or «Región de Argentina». */
  kind: string;
}

interface MapSearchProps {
  options: readonly SearchOption[];
  onChoose: (option: SearchOption) => void;
  label: string;
  placeholder: string;
  noResults: (query: string) => string;
  resultCount: (count: number) => string;
}

const maxResults = 8;

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/** WAI-ARIA combobox with a list of matches; the keyboard path to every country and region. */
export function MapSearch({
  options,
  onChoose,
  label,
  placeholder,
  noResults,
  resultCount,
}: MapSearchProps) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputId = useId();
  const listId = useId();
  const statusId = useId();

  const term = normalize(query);
  const matches =
    term === ''
      ? []
      : options.filter((option) => normalize(option.name).includes(term)).slice(0, maxResults);
  const open = matches.length > 0;

  const choose = (option: SearchOption) => {
    onChoose(option);
    setQuery('');
    setActive(0);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && open) {
      event.preventDefault();
      setActive((index) => (index + 1) % matches.length);
    } else if (event.key === 'ArrowUp' && open) {
      event.preventDefault();
      setActive((index) => (index - 1 + matches.length) % matches.length);
    } else if (event.key === 'Enter' && open) {
      event.preventDefault();
      const option = matches[active];
      if (option) choose(option);
    } else if (event.key === 'Escape') {
      setQuery('');
    }
  };

  return (
    <div className={styles.search}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        className={styles.input}
        type="text"
        role="combobox"
        autoComplete="off"
        placeholder={placeholder}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-describedby={statusId}
        {...(open ? { 'aria-activedescendant': `${listId}-${active}` } : {})}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
      />
      <div id={listId} role="listbox" aria-label={label} className={styles.listbox} hidden={!open}>
        {matches.map((option, index) => (
          // Keyboard users choose from the input (combobox pattern); the click is for pointers.
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events -- keys are handled on the input
          <div
            key={option.id}
            id={`${listId}-${index}`}
            role="option"
            tabIndex={-1}
            aria-selected={index === active}
            className={styles.option}
            onClick={() => {
              choose(option);
            }}
          >
            <span>{option.name}</span>
            <span className={styles.kind}>{option.kind}</span>
          </div>
        ))}
      </div>
      <p id={statusId} className={term === '' ? 'at-visually-hidden' : styles.status} role="status">
        {term === '' ? '' : open ? resultCount(matches.length) : noResults(query.trim())}
      </p>
    </div>
  );
}
