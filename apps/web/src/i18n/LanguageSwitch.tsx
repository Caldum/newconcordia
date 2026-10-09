import styles from './LanguageSwitch.module.css';
import { localeNames, locales } from './locales';
import { useLocale } from './useLocale';

/** Language choice, each option written in its own language. */
export function LanguageSwitch() {
  const { locale, setLocale } = useLocale();
  return (
    <div
      className={styles.switch}
      role="group"
      aria-label={locale === 'es' ? 'Idioma' : 'Language'}
    >
      {locales.map((option) => (
        <button
          key={option}
          type="button"
          lang={option}
          aria-pressed={option === locale}
          className={styles.option}
          onClick={() => {
            setLocale(option);
          }}
        >
          {localeNames[option]}
        </button>
      ))}
    </div>
  );
}
