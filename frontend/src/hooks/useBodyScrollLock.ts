import { useEffect, useRef } from 'react';

/** Locks body scroll (prevents iOS page scroll behind modals) when `locked` is true. */
export function useBodyScrollLock(locked: boolean) {
  const scrollY = useRef(0);

  useEffect(() => {
    if (!locked) return;

    scrollY.current = window.scrollY;
    Object.assign(document.body.style, {
      overflow: 'hidden',
      position: 'fixed',
      top: `-${scrollY.current}px`,
      width: '100%',
    });

    return () => {
      Object.assign(document.body.style, {
        overflow: '',
        position: '',
        top: '',
        width: '',
      });
      window.scrollTo(0, scrollY.current);
    };
  }, [locked]);
}
