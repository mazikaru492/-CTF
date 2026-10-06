import { writeFile } from 'node:fs/promises';
function board(after) {
  const cards = ['INSPECTION', 'SCHEDULE', 'RECORD'];
  const letters = ['S', 'U', 'N'];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="560" viewBox="0 0 1000 560"><rect width="1000" height="560" fill="#172538"/><rect x="35" y="55" width="930" height="458" rx="15" fill="#263d51" stroke="#668096" stroke-width="4"/><text x="70" y="102" fill="#dfe5e9" font-family="monospace" font-size="18">LAB NOTICE BOARD</text>${cards.map((title, i) => `<g transform="translate(${80 + i * 290} 153)"><rect width="250" height="290" rx="8" fill="#dce1e1"/><circle cx="125" cy="18" r="7" fill="#d0653b"/><text x="23" y="65" fill="#122031" font-family="monospace" font-size="18">${title}</text><path d="M23 93h202M23 115h180M23 137h202M23 159h143M23 181h169" stroke="#9eacb3" stroke-width="3"/><rect x="23" y="207" width="204" height="55" rx="5" fill="#c4cfd3"/>${after ? `<text x="125" y="244" text-anchor="middle" fill="#122031" font-family="monospace" font-size="30" font-weight="bold">${letters[i]}</text>` : ''}</g>`).join('')}<text x="72" y="488" fill="#adbecb" font-family="monospace" font-size="12">FICTIONAL EVIDENCE / ${after ? 'AFTER' : 'BEFORE'}</text></svg>`;
}
await writeFile('public/assets/board-before.svg', board(false));
await writeFile('public/assets/board-after.svg', board(true));
