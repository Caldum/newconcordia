import { act, render, renderHook, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { defineMessages } from './defineMessages';
import { LocaleProvider } from './LocaleProvider';
import { useLocale, useMessages } from './useLocale';

const catalog = defineMessages({
  es: { greeting: 'Hola', regions: (count: number) => `${count} regiones` },
  en: { greeting: 'Hello', regions: (count: number) => `${count} regions` },
});

function Greeting() {
  const messages = useMessages(catalog);
  return <p>{`${messages.greeting} · ${messages.regions(6)}`}</p>;
}

describe('LocaleProvider', () => {
  it('renders the active catalog and sets <html lang>', () => {
    render(
      <LocaleProvider initialLocale="en">
        <Greeting />
      </LocaleProvider>,
    );
    expect(screen.getByText('Hello · 6 regions')).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');
  });

  it('switches language and remembers the choice', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <LocaleProvider initialLocale="es">{children}</LocaleProvider>
    );
    const { result } = renderHook(() => ({ ...useLocale(), messages: useMessages(catalog) }), {
      wrapper,
    });
    expect(result.current.messages.greeting).toBe('Hola');

    act(() => {
      result.current.setLocale('en');
    });

    expect(result.current.messages.greeting).toBe('Hello');
    expect(document.documentElement.lang).toBe('en');
    expect(window.localStorage.getItem('concordia.locale')).toBe('en');
  });

  it('detects the locale when none is forced', () => {
    window.localStorage.setItem('concordia.locale', 'en');
    render(
      <LocaleProvider>
        <Greeting />
      </LocaleProvider>,
    );
    expect(screen.getByText('Hello · 6 regions')).toBeInTheDocument();
    window.localStorage.clear();
  });

  it('fails loudly outside the provider', () => {
    expect(() => renderHook(() => useLocale())).toThrow(/LocaleProvider/);
  });
});
