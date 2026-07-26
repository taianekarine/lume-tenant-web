'use client';

import { useCallback, useSyncExternalStore } from 'react';

function subscribeToScroll(callback: () => void) {
  window.addEventListener('scroll', callback, {
    passive: true,
  });

  return () => {
    window.removeEventListener('scroll', callback);
  };
}

export function useScroll(threshold = 20) {
  const getSnapshot = useCallback(() => window.scrollY > threshold, [threshold]);

  const getServerSnapshot = useCallback(() => false, []);

  return useSyncExternalStore(subscribeToScroll, getSnapshot, getServerSnapshot);
}
