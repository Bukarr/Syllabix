export type Theme = 'dark' | 'light';

const THEME_KEY = 'syllabix:theme';

export function getStoredTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === 'light' ? 'light' : 'dark';
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'light') {
    root.classList.add('light');
  } else {
    root.classList.remove('light');
  }
  localStorage.setItem(THEME_KEY, theme);
}

export function initTheme() {
  applyTheme(getStoredTheme());
}
