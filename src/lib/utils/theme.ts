export function cycleTheme() {
  const currentTheme = localStorage.getItem('theme') || 'system';

  let newTheme: string;
  if (currentTheme === 'light') {
    newTheme = 'dark';
  } else if (currentTheme === 'dark') {
    newTheme = 'system';
  } else {
    newTheme = 'light';
  }

  // Update localStorage
  localStorage.setItem('theme', newTheme);

  // Update DOM classes
  document.documentElement.classList.remove('light', 'dark');
  if (newTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else if (newTheme === 'light') {
    document.documentElement.classList.add('light');
  } else {
    // System theme
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.add(isDark ? 'dark' : 'light');
  }

  // Trigger storage event for next-themes
  window.dispatchEvent(new StorageEvent('storage', {
    key: 'theme',
    newValue: newTheme
  }));

  return newTheme;
}

export function getThemeDisplayName(theme: string): string {
  return theme.charAt(0).toUpperCase() + theme.slice(1);
}
