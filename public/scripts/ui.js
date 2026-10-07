export const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
// Consistent SVG symbols describe each task without depending on symbol fonts.
const iconPaths = {
  cipher:
    '<circle cx="8" cy="8" r="5"/><path d="m11.5 11.5 9 9M16 16l3-3m0 6 3-3"/><circle cx="7" cy="7" r=".6" fill="currentColor" stroke="none"/>',
  ascii:
    '<g fill="currentColor" stroke="none" font-family="Arial,sans-serif" font-weight="700"><text x="2" y="10" font-size="10">65</text><text x="13" y="22" font-size="12">A</text></g><path d="M17 4h4v9m-3-3 3 3 2-3M3 14v6h5"/>',
  image:
    '<path d="M11 20H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M3 15l5-5 4 4"/><circle cx="14" cy="7" r="1.5"/><circle cx="16" cy="16" r="4"/><path d="m19 19 3 3"/>',
  compare:
    '<rect x="2" y="3" width="8" height="12" rx="1.5"/><rect x="14" y="9" width="8" height="12" rx="1.5"/><path d="M14 3h6l-2-2m2 2-2 2M10 21H4l2-2m-2 2 2 2M5 7h2m10 6h2m-2 4h2"/>',
  logs: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4M12 7v4"/><circle cx="12" cy="14" r=".7" fill="currentColor" stroke="none"/>',
  records:
    '<path d="M10 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v3M3 9h9"/><circle cx="16" cy="16" r="4"/><path d="m19 19 3 3"/>',
  order: '<circle cx="10" cy="10" r="7"/><path d="M10 6v4l3 2M20 9v12m-3-3 3 3 3-3M3 20h10"/>',
  final:
    '<rect x="4" y="10" width="16" height="12" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0"/><circle cx="12" cy="15" r="1.5"/><path d="M12 16.5V19"/>',
};
export const icons = Object.fromEntries(
  Object.entries(iconPaths).map(([kind, paths]) => [
    kind,
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">${paths}</svg>`,
  ]),
);
export const mascot = (name, extra = '') =>
  `<span class="mascot mascot-${name} ${extra}" role="img" aria-label="${name === 'rai' ? 'ライ' : 'リイ'}"></span>`;

export function animateResult(correct) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const target = document.querySelector(correct ? '#explanation .result-visual' : '#answer-form');
  target?.getAnimations().forEach((animation) => animation.cancel());
  target?.animate(
    correct
      ? [
          { opacity: 0, transform: 'translateY(14px) scale(.96)' },
          { opacity: 1, transform: 'translateY(-3px) scale(1.01)', offset: 0.7 },
          { opacity: 1, transform: 'none' },
        ]
      : [
          { transform: 'translateX(0)' },
          { transform: 'translateX(-5px)' },
          { transform: 'translateX(5px)' },
          { transform: 'translateX(-3px)' },
          { transform: 'translateX(0)' },
        ],
    { duration: correct ? 650 : 360, easing: 'ease-out' },
  );
  if (correct) {
    const character = target?.querySelector('.mascot');
    character?.animate(
      [
        { transform: 'translateY(0)' },
        { transform: 'translateY(-12px)', offset: 0.4 },
        { transform: 'translateY(0)' },
      ],
      { duration: 650, iterations: 2, easing: 'ease-out' },
    );
  }
}
