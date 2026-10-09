import { Note } from '@concordia/atlas/Note';
import { useId } from 'react';

import { defineMessages, formatNumber, useLocale, useMessages } from '../../i18n';
import { CountryField } from '../auth/CountryField';
import { useWorld } from '../world/useWorld';

import { useWaitlistCount } from './queries';
import styles from './WaitlistChoice.module.css';

const messages = defineMessages({
  es: {
    label: 'País que quieres esperar',
    placeholder: 'Elige un país',
    required: 'Elige el país que quieres esperar.',
    notAvailable: (country: string) => `${country} no está disponible actualmente.`,
    waiting: (count: string) => `Hay ${count} personas esperando.`,
    waitingOne: 'Hay 1 persona esperando.',
    waitingNone: 'Serías la primera persona en la lista.',
    explain:
      'Lo agregaremos cuando haya suficientes jugadores esperando y te escribiremos ese mismo día. Mientras tanto juegas en otro país y, cuando abra, te mudas con todo lo que tengas.',
    startTitle: '¿Dónde quieres comenzar?',
  },
  en: {
    label: 'Country you want to wait for',
    placeholder: 'Choose a country',
    required: 'Choose the country you want to wait for.',
    notAvailable: (country: string) => `${country} is not available yet.`,
    waiting: (count: string) => `${count} people are waiting.`,
    waitingOne: '1 person is waiting.',
    waitingNone: 'You would be the first person on the list.',
    explain:
      'We will add it when enough players are waiting and email you that same day. Meanwhile you play in another country and, when it opens, you move with everything you have.',
    startTitle: 'Where do you want to start?',
  },
});

interface WaitlistChoiceProps {
  waitlistCountry: string | null;
  onWaitlistCountry: (code: string | null) => void;
  startCountry: string | null;
  onStartCountry: (code: string) => void;
  showErrors: boolean;
}

/** «Otro país»: wait for a country that is not in play and pick where to start meanwhile. */
export function WaitlistChoice({
  waitlistCountry,
  onWaitlistCountry,
  startCountry,
  onStartCountry,
  showErrors,
}: WaitlistChoiceProps) {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const world = useWorld();
  const count = useWaitlistCount(waitlistCountry);
  const selectId = useId();
  const errorId = `${selectId}-error`;

  const nameOf = (country: { name_es: string; name_en: string }) =>
    locale === 'es' ? country.name_es : country.name_en;
  // Countries with an ISO code; bases and small territories cannot be played.
  const options = world.data
    ? [...world.data.countries.values()]
        .filter((country) => !country.is_active && country.iso2)
        .map((country) => ({ code: country.code, name: nameOf(country) }))
        .sort((a, b) => a.name.localeCompare(b.name, locale))
    : [];
  const chosen = waitlistCountry ? world.data?.countries.get(waitlistCountry) : undefined;
  const missing = showErrors && !waitlistCountry;

  let waitingText = '';
  if (count.data !== undefined) {
    waitingText =
      count.data === 0
        ? copy.waitingNone
        : count.data === 1
          ? copy.waitingOne
          : copy.waiting(formatNumber(count.data, locale));
  }

  return (
    <div className={styles.choice}>
      <div className={styles.field}>
        <label htmlFor={selectId} className="at-label">
          {copy.label}
        </label>
        <select
          id={selectId}
          className={styles.select}
          value={waitlistCountry ?? ''}
          aria-invalid={missing ? true : undefined}
          aria-describedby={missing ? errorId : undefined}
          onChange={(event) => {
            onWaitlistCountry(event.target.value || null);
          }}
        >
          <option value="">{copy.placeholder}</option>
          {options.map((option) => (
            <option key={option.code} value={option.code}>
              {option.name}
            </option>
          ))}
        </select>
        {missing ? (
          <span id={errorId} className={styles.error}>
            {copy.required}
          </span>
        ) : null}
      </div>
      {chosen ? (
        <Note tone="info">
          <strong>{copy.notAvailable(nameOf(chosen))}</strong> {waitingText} {copy.explain}
        </Note>
      ) : null}
      <CountryField
        value={startCountry}
        onChange={onStartCountry}
        showErrors={showErrors}
        title={copy.startTitle}
      />
    </div>
  );
}
