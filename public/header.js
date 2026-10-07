// Reserve the fixed header's actual height for anchors and the mission sidebar.
const header = document.querySelector('.site-header');
const updateHeaderHeight = () =>
  document.documentElement.style.setProperty(
    '--header-height',
    `${header.getBoundingClientRect().height}px`,
  );
updateHeaderHeight();
if (typeof ResizeObserver === 'function') new ResizeObserver(updateHeaderHeight).observe(header);
else window.addEventListener('resize', updateHeaderHeight);
