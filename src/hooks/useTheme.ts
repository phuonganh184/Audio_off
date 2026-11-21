import { useEffect, useState } from 'react';
import type { ThemeMode } from '@/src/types';

const THEME_KEY = 'truyen_audio_theme';

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'auto') return saved;
    } catch {
      // Ignore storage errors
    }
    return 'dark';
  });

  useEffect(() => {
    const apply = (mode: ThemeMode) => {
      const prefersDark =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = mode === 'dark' || (mode === 'auto' && prefersDark);
      document.documentElement.classList.toggle('dark', isDark);
      document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute('content', isDark ? '#111318' : '#f6f5f1');
      }
    };

    apply(theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Ignore
    }

    if (theme === 'auto') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const onChange = () => apply('auto');
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    }
  }, [theme]);

  return { theme, setTheme: setThemeState };
}
