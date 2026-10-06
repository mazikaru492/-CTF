(() => {
  const key = 'ctf-background-theme';
  let theme = 'light';
  try { if (localStorage.getItem(key) === 'dark') theme = 'dark'; } catch { /* Storage may be unavailable in private or restricted browsers. */ }

  function applyTheme(value) {
    theme = value;
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#122031' : '#f5f7fa';
    document.querySelectorAll('[data-theme-choice]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.themeChoice === theme));
    });
  }

  // Restore before the body is painted, without waiting for the game API.
  applyTheme(theme);
  document.addEventListener('DOMContentLoaded', () => {
    applyTheme(theme);
    document.querySelectorAll('[data-theme-choice]').forEach(button => {
      button.addEventListener('click', () => {
        applyTheme(button.dataset.themeChoice);
        try { localStorage.setItem(key, theme); } catch { /* The current page can still switch themes. */ }
      });
    });
  });
})();
