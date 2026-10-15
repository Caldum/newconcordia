import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

/**
 * Whether an element is in the viewport and the tab is visible: scenes stop their own timers when nobody can see
 * them. True where the browser cannot tell.
 */
export function useOnScreen(ref: RefObject<Element | null>): boolean {
  const [inView, setInView] = useState(true);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver !== 'function') return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry?.isIntersecting ?? true);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [ref]);

  useEffect(() => {
    const update = () => {
      setVisible(document.visibilityState !== 'hidden');
    };
    document.addEventListener('visibilitychange', update);
    return () => {
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  return inView && visible;
}
