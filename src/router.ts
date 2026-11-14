import { useEffect, useState } from 'react';

/** Minimal hash router (GitHub Pages friendly, works offline). */
export function currentPath(): string {
  const h = typeof location !== 'undefined' ? location.hash.replace(/^#/, '') : '';
  return h || '/';
}

export function useRoute(): string {
  const [path, setPath] = useState(currentPath());
  useEffect(() => {
    const on = () => {
      setPath(currentPath());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return path;
}

export function navigate(path: string): void {
  location.hash = path;
}

export function back(): void {
  if (history.length > 1) history.back();
  else navigate('/');
}
