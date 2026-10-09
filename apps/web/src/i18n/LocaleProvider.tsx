import { createContext, useCallback, useLayoutEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { detectLocale, storeLocale } from './detectLocale';
import type { Locale } from './locales';

export interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const LocaleContext = createContext<LocaleContextValue | null>(null);

interface LocaleProviderProps {
  children: ReactNode;
  /** Forces a locale (tests); otherwise it is detected from storage and the browser. */
  initialLocale?: Locale;
}

export function LocaleProvider({ children, initialLocale }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(() => initialLocale ?? detectLocale());

  // Screen readers pick the voice from <html lang>, so it must change with the copy, before paint.
  useLayoutEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    storeLocale(next);
    setLocaleState(next);
  }, []);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);
  return <LocaleContext value={value}>{children}</LocaleContext>;
}
