(() => {
  const key = 'ctf-background-theme';
  let theme = 'dark';
  try {
    const saved = localStorage.getItem(key);
    if (saved === 'light' || saved === 'dark') theme = saved;
  } catch { /* Storage may be unavailable in private or restricted browsers. */ }

  function applyTheme(value) {
    theme = value;
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#122031' : '#f5f7fa';
    document.querySelector('#theme-toggle')?.setAttribute('aria-checked', String(theme === 'dark'));
  }

  // Restore before the body is painted, without waiting for the game API.
  applyTheme(theme);
  document.addEventListener('DOMContentLoaded', () => {
    applyTheme(theme);
    const header = document.querySelector('.site-header');
    const updateHeaderHeight = () => document.documentElement.style.setProperty('--header-height', `${header.getBoundingClientRect().height}px`);
    updateHeaderHeight();
    if (typeof ResizeObserver === 'function') new ResizeObserver(updateHeaderHeight).observe(header);
    else window.addEventListener('resize', updateHeaderHeight);
    document.querySelector('#theme-toggle').addEventListener('click', () => {
      applyTheme(theme === 'dark' ? 'light' : 'dark');
      try { localStorage.setItem(key, theme); } catch { /* The current page can still switch themes. */ }
    });
  });
})();
