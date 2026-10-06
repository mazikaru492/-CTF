const main = document.querySelector('#main');
const official = 'https://www.mod.go.jp/j/approach/defense/cyber/c_contest/';
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Consistent SVG symbols describe each task without depending on symbol fonts.
const iconPaths = {
  cipher: '<circle cx="8" cy="8" r="5"/><path d="m11.5 11.5 9 9M16 16l3-3m0 6 3-3"/><circle cx="7" cy="7" r=".6" fill="currentColor" stroke="none"/>',
  ascii: '<g fill="currentColor" stroke="none" font-family="Arial,sans-serif" font-weight="700"><text x="2" y="10" font-size="10">65</text><text x="13" y="22" font-size="12">A</text></g><path d="M17 4h4v9m-3-3 3 3 2-3M3 14v6h5"/>',
  image: '<path d="M11 20H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M3 15l5-5 4 4"/><circle cx="14" cy="7" r="1.5"/><circle cx="16" cy="16" r="4"/><path d="m19 19 3 3"/>',
  compare: '<rect x="2" y="3" width="8" height="12" rx="1.5"/><rect x="14" y="9" width="8" height="12" rx="1.5"/><path d="M14 3h6l-2-2m2 2-2 2M10 21H4l2-2m-2 2 2 2M5 7h2m10 6h2m-2 4h2"/>',
  logs: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4M12 7v4"/><circle cx="12" cy="14" r=".7" fill="currentColor" stroke="none"/>',
  records: '<path d="M10 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v3M3 9h9"/><circle cx="16" cy="16" r="4"/><path d="m19 19 3 3"/>',
  order: '<circle cx="10" cy="10" r="7"/><path d="M10 6v4l3 2M20 9v12m-3-3 3 3 3-3M3 20h10"/>',
  final: '<rect x="4" y="10" width="16" height="12" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0"/><circle cx="12" cy="15" r="1.5"/><path d="M12 16.5V19"/>'
};
const icons = Object.fromEntries(Object.entries(iconPaths).map(([kind, paths]) => [kind, `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">${paths}</svg>`]));
const mascot = (name, extra = '') => `<span class="mascot mascot-${name} ${extra}" role="img" aria-label="${name === 'rai' ? 'ライ' : 'リイ'}"></span>`;

function animateResult(correct) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const target = document.querySelector(correct ? '#explanation .result-visual' : '#answer-form');
  target?.getAnimations().forEach(animation => animation.cancel());
  target?.animate(correct
    ? [{ opacity: 0, transform: 'translateY(14px) scale(.96)' }, { opacity: 1, transform: 'translateY(-3px) scale(1.01)', offset: .7 }, { opacity: 1, transform: 'none' }]
    : [{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }],
  { duration: correct ? 650 : 360, easing: 'ease-out' });
  if (correct) {
    const character = target?.querySelector('.mascot');
    character?.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-12px)', offset: .4 }, { transform: 'translateY(0)' }], { duration: 650, iterations: 2, easing: 'ease-out' });
  }
}
let data;
let progress;
let renderId = 0;
let queue = Promise.resolve();
async function api(action, id, extra = {}) {
  const task = queue.then(async () => {
    const source = new URLSearchParams(location.search).get('source');
    const url = '/api/game' + (!action && ['school', 'x', 'event'].includes(source) ? `?source=${source}` : '');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, { signal: controller.signal, ...(action ? { method: 'POST', keepalive: action === 'official', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, id, ...extra }) } : {}) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '接続できませんでした。');
      if (result.progress) { progress = result.progress; updateScore(); }
      return result;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('通信に時間がかかっています。接続を確認して、もう一度お試しください。');
      if (error instanceof TypeError || error instanceof SyntaxError) throw new Error('接続できませんでした。通信環境を確認して、もう一度お試しください。');
      throw error;
    } finally { clearTimeout(timeout); }
  });
  queue = task.catch(() => {});
  return task;
}
function updateScore() { if (progress) document.querySelector('#header-score').textContent = `${progress.solved.length} / 8`; }
function stateLabel(id) { return progress.solved.includes(id) ? '✓ 正解' : progress.learned.includes(id) ? '解説で学習' : progress.viewed.includes(id) ? '挑戦中' : '未挑戦'; }
function nextId(id = 0) { return data.find(c => c.id > id && !progress.solved.includes(c.id) && !progress.learned.includes(c.id))?.id || data.find(c => !progress.solved.includes(c.id) && !progress.learned.includes(c.id))?.id; }
function missionCards() {
  return data.map(c => `<a class="mission-card ${progress.solved.includes(c.id) ? 'done' : ''} ${progress.learned.includes(c.id) ? 'learned' : ''}" href="#mission-${c.id}" aria-label="ミッション${c.id} ${escape(c.title)} ${stateLabel(c.id)}"><div class="card-top"><span class="card-number">MISSION ${String(c.id).padStart(2, '0')}</span><span class="card-icon" aria-hidden="true">${icons[c.kind]}</span></div><div><h3>${escape(c.title)}</h3><p>${escape(c.subtitle)}</p></div><div class="card-bottom"><span class="category-label">${escape(c.category)}</span><span class="card-status">${stateLabel(c.id)}</span></div></a>`).join('');
}
function officialCta() {
  return `<section class="official-cta" aria-label="公式大会の案内"><h2>防衛省サイバーコンテストのご案内</h2><div class="official-body"><p>暗号やネットワークなど、情報セキュリティに関する問題に挑戦するコンテストです。</p><p>開催情報・参加条件・募集状況は、防衛省ホームページをご確認ください。</p><a class="official-link" href="${official}" target="_blank" rel="noopener noreferrer"><span class="official-link-text">防衛省サイバーコンテスト<span class="official-domain">防衛省ホームページ ／ www.mod.go.jp</span></span><span class="official-external">外部サイト <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true" focusable="false"><path d="M14 3h7v7m0-7L10 14M10 5H4a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-6"/></svg></span></a><p class="official-note">この練習のクリアは、大会の参加条件ではありません。<br>本サイトは学生企画の体験サイトです。</p></div></section>`;
}
function sidebarList(id) {
  return `<ol class="sidebar-list">${data.map(c => `<li><a class="${c.id === id ? 'active' : ''}" href="#mission-${c.id}" ${c.id === id ? 'aria-current="page"' : ''}><span class="num">${String(c.id).padStart(2, '0')}</span><span>${escape(c.title)}</span><span class="tick" aria-label="${stateLabel(c.id)}">${progress.solved.includes(c.id) ? '✓' : progress.learned.includes(c.id) ? '◇' : '·'}</span></a></li>`).join('')}</ol>`;
}
function progressPanel() {
  return `<div class="progress-panel"><p>あなたのミッション</p><div class="progress-count"><strong>${progress.solved.length}</strong><span>/ 8 正解</span></div><div class="progress-track" role="progressbar" aria-label="正解した問題数" aria-valuenow="${progress.solved.length}" aria-valuemin="0" aria-valuemax="8"><div class="progress-fill p${progress.solved.length}"></div></div><p>解説で学習：${progress.learned.length}問</p></div>`;
}
function home() {
  const resume = nextId() || 1;
  const hasProgress = progress.solved.length || progress.learned.length || progress.viewed.length;
  main.innerHTML = `<div class="container"><section class="hero"><div><p class="eyebrow">スマホで体験・はじめてのサイバー宝探し</p><h1><span class="line">そのひらめきが、</span><span class="line">はじめの一歩。</span></h1><p class="hero-copy">スマホで、サイバー宝探し。<br>暗号・画像・記録から、答えの合言葉を探そう。<br>この合言葉を「フラグ」と呼びます。<br>専門知識は不要。各問題の「ヒントを見る」から手助けを受けられます。</p><div class="hero-actions"><a class="btn primary" href="#mission-${resume}">${hasProgress ? 'つづきから挑戦する' : '最初のミッションへ'} <span class="arrow" aria-hidden="true">→</span></a><a class="text-link" href="${official}" target="_blank" rel="noopener noreferrer">大会の公式案内を見る ↗</a></div><p class="hero-note">登録・インストール不要。１問だけの挑戦でもOK。</p></div><div class="mascot-welcome"><div class="mascot-duo">${mascot('rai')}${mascot('rii')}</div><p class="mascot-greeting">ひらめきを、一緒に見つけよう。</p><p class="mascot-caption">防衛省サイバーコンテストの<br>マスコット「ライ」「リイ」</p><p class="mascot-caption">この体験は学生企画・非公式です。</p></div></section><div class="hero-stats"><div class="stat"><strong>08</strong><span>４ジャンルの<br>体験ミッション</span></div><div class="stat"><strong>1–3</strong><span>分で最初の１問<br>所要時間の目安</span></div><div class="stat"><strong>FREE</strong><span>無料ヒント<br>全問解説付き</span></div></div><section class="intro-strip"><div><p class="eyebrow">はじめての方へ</p><h3>遊び方は、３ステップ。</h3></div><div class="steps"><div><span class="step-num">01</span><strong>手がかりを調べる</strong><p>画像や記録から、隠された情報を探します。</p></div><div><span class="step-num">02</span><strong>困ったらヒントを見る</strong><p>問題文のすぐ下にあるボタンから、２段階のヒントを表示。無料・減点なしです。</p></div><div><span class="step-num">03</span><strong>合言葉を入力する</strong><p>回答欄に入力して「フラグを提出」を押します。解けなくても解説を見て進めます。</p></div></div></section><section id="missions-section"><div class="section-head"><div><p class="eyebrow">挑戦する問題を選ぶ</p><h2>８つの小さな謎を、解き明かそう。</h2></div><p>迷ったら「01 消えた合言葉」から。１問だけでもOK。</p></div><div class="missions-grid">${missionCards()}</div></section>${officialCta()}</div>`;
}
function material(c) {
  const m = c.material;
  const label = `<p class="material-label">手がかりを調べよう</p>`;
  const alphabet = `<div class="alphabet" aria-label="アルファベット対応表">${[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map(l => `<span>${l}</span>`).join('')}</div>`;
  const cipher = text => `<div class="cipher" aria-label="暗号 ${escape(text)}">${[...text].map(l => `<span>${l}</span>`).join('')}</div>`;
  const imageButton = (src, alt) => `<button class="image-open" data-image="${escape(src)}" data-alt="${escape(alt)}" aria-label="調査画像を拡大する"><img src="${escape(src)}" alt="${escape(alt)}"></button><p class="image-action">⊕ タップして拡大・調査</p>`;
  const textClue = () => `<details class="text-clue"><summary>${escape(m.textClue)}（画像が見づらいとき）</summary><p>${escape(m.textDetail)}</p></details>`;
  if (c.kind === 'cipher') return `${label}${cipher(m.cipher)}${alphabet}<p class="material-tip">文字を「１つ前」へ戻してみよう。</p>`;
  if (c.kind === 'ascii') return `${label}<div class="number-strip" aria-label="通信記録 ${m.numbers.join(' ')}">${m.numbers.map(n => `<span>${n}</span>`).join('')}</div><div class="ascii-grid" aria-label="ASCII対応表">${[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((l, i) => `<div class="ascii-cell"><b>${l}</b><small>${65 + i}</small></div>`).join('')}</div><p class="material-tip">数字と一致する英字を順番に読もう。</p>`;
  if (c.kind === 'image') return `${label}${imageButton(m.image, m.alt)}${textClue()}`;
  if (c.kind === 'compare') return `${label}<div class="segmented"><button data-compare="before" aria-pressed="true">変更前</button><button data-compare="after" aria-pressed="false">変更後</button></div>${imageButton(m.before, '３枚のカードが並んだ、変更前の掲示板')}<p id="compare-caption" class="material-tip" aria-live="polite">変更前の掲示板を表示中</p>${textClue()}`;
  if (c.kind === 'logs') return `${label}<div class="log-head"><span>時刻</span><span>端末</span><span>結果</span></div>${m.logs.map(l => `<div class="log-row"><span>${l.time}</span><span>端末 ${l.device}</span><span class="${l.result === '失敗' ? 'failure' : ''}">${l.result}</span></div>`).join('')}<p class="material-tip">調べる端末をタップしてコードを確認</p><div class="device-grid">${m.devices.map(d => `<button class="device-btn" data-device="${d.id}" aria-pressed="false"><span>端末 ${d.id}</span><span class="device-code">コードを見る</span></button>`).join('')}</div><p id="device-detail" class="material-tip" aria-live="polite"></p>`;
  if (c.kind === 'records') return `${label}<p class="material-label">現在の一覧</p><div class="record-list">${m.current.map(id => `<span>${id}</span>`).join('')}</div><p class="material-label">バックアップ</p><div class="device-grid">${m.backup.map(d => `<button class="device-btn" data-record="${d.id}" aria-pressed="false"><span>${d.id}</span><span class="device-code">開いて調べる</span></button>`).join('')}</div><p id="record-detail" class="material-tip" aria-live="polite"></p>`;
  if (c.kind === 'order') return `${label}<div id="order-list" class="order-list"></div><p class="material-tip">時刻順に並べ、文字を上から読もう。</p><p class="order-result" id="order-result" aria-live="polite"></p>`;
  if (c.kind === 'final') return `${label}${imageButton(m.image, m.alt)}${textClue()}<p class="rule"><strong>調査記録</strong><br>${escape(m.rule)}</p>${cipher(m.cipher)}${alphabet}`;
  return '';
}
async function mission(id, token) {
  const c = data.find(c => c.id === id);
  if (!c) { location.hash = '#home'; return; }
  main.innerHTML = `<div class="container"><div class="workspace"><aside class="mission-sidebar" aria-label="ミッション一覧">${progressPanel()}${sidebarList(id)}<div class="sidebar-footer"><a href="#result">結果・復習を見る →</a><p class="notice">ヒントは無料。<br>１問だけの挑戦でもOK。</p></div></aside><article class="challenge"><details class="mobile-missions"><summary>ミッション ${String(id).padStart(2, '0')} / 08 <span>${progress.solved.length}問正解</span></summary>${sidebarList(id)}<a class="text-link" href="#result">結果・復習を見る →</a></details><header class="challenge-header"><div class="challenge-topline"><span class="challenge-number">MISSION ${String(id).padStart(2, '0')}</span><span>${escape(c.category)}</span><span>／ ${escape(c.difficulty)}</span></div><h1>${escape(c.title)}</h1><p class="subtitle">${escape(c.subtitle)} ／ 目安 ${escape(c.time)}</p></header><p class="story">${escape(c.story)}</p><div class="mission-instruction">${escape(c.instruction)}</div><section class="hints-panel" aria-labelledby="hints-title"><div class="hint-actions"><div class="hint-guide">${mascot('rii')}<div><h2 id="hints-title">困ったら、ここでヒント</h2><p>２段階のヒントでお手伝い。無料・減点なしです。</p></div></div><button id="hint-button" class="btn small" aria-controls="hint-items">ヒントを見る（0 / 2）</button></div><div id="hint-items" aria-live="polite" aria-atomic="true"></div><p id="hint-feedback" class="hint-feedback" role="status"></p></section><section class="material-box" aria-label="調査素材">${material(c)}</section><form id="answer-form" class="answer-panel"><label for="flag-input">見つけたフラグ（合言葉）</label><div class="answer-row"><input id="flag-input" name="flag" type="text" placeholder="合言葉を入力" maxlength="100" autocomplete="off" autocapitalize="characters" spellcheck="false" required aria-describedby="input-note feedback"><button id="submit-answer" class="btn primary" type="submit">フラグを提出 <span aria-hidden="true">→</span></button></div><p id="input-note" class="input-note">大文字・小文字、全角英数字の違いは気にしなくてOK。</p><div id="feedback" class="feedback" role="status" aria-live="polite" aria-atomic="true"></div></form><button id="explanation-button" class="explanation-link">解けなくても、解説を見て進む →</button><section id="explanation" class="explanation hidden" aria-label="問題の解説" tabindex="-1"></section><p class="notice">練習のクリアは参加条件ではありません。<a href="${official}" target="_blank" rel="noopener noreferrer">大会の公式案内を見る ↗</a></p></article></div></div>`;
  setupMaterials(c);
  const input = document.querySelector('#flag-input');
  input.setAttribute('inputmode', 'text');
  input.setAttribute('enterkeyhint', 'send');
  input.setAttribute('autocorrect', 'off');
  let composing = false;
  let compositionEnded = 0;
  input.addEventListener('compositionstart', () => { composing = true; });
  input.addEventListener('compositionend', () => { composing = false; compositionEnded = performance.now(); });
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.isComposing || composing || event.keyCode === 229 || performance.now() - compositionEnded < 100)) event.preventDefault();
  });
  document.querySelector('#answer-form').addEventListener('submit', async event => {
    event.preventDefault();
    const button = document.querySelector('#submit-answer');
    if (composing || button.disabled) return;
    const feedback = document.querySelector('#feedback');
    const value = document.querySelector('#flag-input').value;
    button.disabled = true; button.textContent = '確認しています…'; feedback.className = 'feedback'; feedback.textContent = '回答を確認しています…';
    document.querySelector('#answer-form').classList.remove('answer-correct', 'answer-incorrect');
    input.removeAttribute('aria-invalid');
    try {
      const result = await api('answer', id, { answer: value });
      if (token !== renderId) return;
      feedback.textContent = result.correct ? (result.assisted ? '✓ 答えを確認できました。解説で学習した問題です。' : '✓ 正解！フラグを発見しました。') : '';
      feedback.className = result.correct ? 'feedback success' : 'feedback retry';
      if (!result.correct) feedback.innerHTML = `${mascot('rii')}<span><strong>もう一歩！ 今回は不正解です。</strong><span>入力した合言葉と手がかりを、もう一度見比べてみよう。上のヒントも使えます。</span></span>`;
      document.querySelector('#answer-form').classList.add(result.correct ? 'answer-correct' : 'answer-incorrect');
      if (!result.correct) input.setAttribute('aria-invalid', 'true');
      refreshProgress(id);
      if (result.correct) { input.blur(); showExplanation(c, result, true); }
      animateResult(result.correct);
    } catch (error) { if (token === renderId) { feedback.textContent = error.message; feedback.className = 'feedback error'; } }
    finally { if (token === renderId) { button.disabled = false; button.innerHTML = 'フラグを提出 <span aria-hidden="true">→</span>'; } }
  });
  document.querySelector('#hint-button').addEventListener('click', async () => {
    const button = document.querySelector('#hint-button'); button.disabled = true;
    document.querySelector('#hint-feedback').textContent = '';
    try { const result = await api('hint', id); if (token === renderId) showHints(result.hints); }
    catch (error) { if (token === renderId) document.querySelector('#hint-feedback').textContent = error.message; }
    finally { if (token === renderId) button.disabled = progress.hints[id - 1] >= 2; }
  });
  document.querySelector('#explanation-button').addEventListener('click', async () => {
    const alreadySolved = progress.solved.includes(id);
    if (!alreadySolved && !(await confirmAction('解説を見ますか？', '答えと解き方を表示します。この問題は「解説で学習」として記録され、自分で解いた正解数には含めません。', '解説を見る'))) return;
    if (token !== renderId) return;
    try { const result = await api('explanation', id); if (token === renderId) { refreshProgress(id); showExplanation(c, result, true); } }
    catch (error) { if (token === renderId) document.querySelector('#feedback').textContent = error.message; }
  });
  try {
    await api('view', id);
    const saved = await api('restore', id);
    if (token !== renderId) return;
    showHints(saved.hints || []);
    if (saved.explanation) showExplanation(c, saved, false);
    refreshProgress(id);
  } catch (error) { if (token === renderId) document.querySelector('#feedback').textContent = error.message; }
}
function refreshProgress(id) {
  const sidebar = document.querySelector('.mission-sidebar');
  if (sidebar) sidebar.innerHTML = `${progressPanel()}${sidebarList(id)}<div class="sidebar-footer"><a href="#result">結果・復習を見る →</a><p class="notice">ヒントは無料。１問だけでもOK。</p></div>`;
  const mobile = document.querySelector('.mobile-missions');
  if (mobile) { const open = mobile.open; mobile.innerHTML = `<summary>ミッション ${String(id).padStart(2, '0')} / 08 <span>${progress.solved.length}問正解</span></summary>${sidebarList(id)}<a class="text-link" href="#result">結果・復習を見る →</a>`; mobile.open = open; }
}
function showHints(hints) {
  document.querySelector('#hint-items').innerHTML = hints.map((hint, i) => `<p class="hint-item"><strong>ヒント ${i + 1}</strong>${escape(hint)}</p>`).join('');
  const button = document.querySelector('#hint-button');
  button.textContent = hints.length >= 2 ? 'すべてのヒントを表示中' : `ヒントを見る（${hints.length} / 2）`;
  button.disabled = hints.length >= 2;
}
function showExplanation(c, result, shouldFocus) {
  const el = document.querySelector('#explanation');
  const next = nextId(c.id);
  el.classList.remove('hidden');
  el.innerHTML = `<div class="result-visual ${result.assisted ? 'is-learned' : 'is-correct'}">${mascot(result.assisted ? 'rii' : 'rai')}<div><span class="result-symbol" aria-hidden="true">${result.assisted ? '◇' : '✓'}</span><p class="eyebrow">${result.assisted ? '解説で学習' : '正解！'}</p><h2>${result.assisted ? '新しい発見を、次の一歩へ。' : 'フラグを発見！'}</h2><p>${result.assisted ? '答えの理由を、一緒に確認しよう。' : '手がかりをつなげられたね！'}</p></div>${shouldFocus && !result.assisted ? '<div class="confetti" aria-hidden="true">' + '<i></i>'.repeat(12) + '</div>' : ''}</div><div class="answer-display">${escape(result.answer)}</div><p>${escape(result.explanation)}</p><p class="learning"><strong>この問題で学べること</strong><br>${escape(result.learning)}</p><div class="next-actions">${next ? `<a class="btn primary" href="#mission-${next}">次のミッションへ →</a>` : '<a class="btn primary" href="#result">体験の結果を見る →</a>'}<a class="btn" href="#result">結果・復習</a></div>`;
  if (shouldFocus) { el.focus({ preventScroll: true }); el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); }
}
function setupMaterials(c) {
  main.querySelectorAll('[data-image]').forEach(button => button.addEventListener('click', () => openImage(button.dataset.image, button.dataset.alt)));
  if (c.kind === 'compare') {
    main.querySelectorAll('[data-compare]').forEach(button => button.addEventListener('click', () => {
      const before = button.dataset.compare === 'before';
      main.querySelectorAll('[data-compare]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
      const image = main.querySelector('.image-open'); const src = before ? c.material.before : c.material.after;
      const alt = before ? '変更前の掲示板' : '変更後の掲示板。３つのカードに英字が追加されている。';
      image.dataset.image = src; image.dataset.alt = alt; image.querySelector('img').src = src; image.querySelector('img').alt = alt;
      document.querySelector('#compare-caption').textContent = `${before ? '変更前' : '変更後'}の掲示板を表示中`;
    }));
  }
  const selectable = c.kind === 'logs' ? { attr: 'device', items: c.material.devices, output: '#device-detail' } : c.kind === 'records' ? { attr: 'record', items: c.material.backup, output: '#record-detail' } : null;
  if (selectable) main.querySelectorAll(`[data-${selectable.attr}]`).forEach(button => button.addEventListener('click', () => {
    const item = selectable.items.find(d => d.id === button.dataset[selectable.attr]);
    main.querySelectorAll(`[data-${selectable.attr}]`).forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    document.querySelector(selectable.output).textContent = `${item.id} のコード：${item.code}`;
    button.querySelector('.device-code').textContent = item.code;
  }));
  if (c.kind === 'order') {
    let cards = [...c.material.cards];
    function drawOrder(focusId, direction) {
      document.querySelector('#order-list').innerHTML = cards.map((card, index) => `<div class="order-card"><span class="order-letter">${card.letter}</span><div class="order-info"><time>${card.time}</time>${escape(card.event)}</div><div class="order-controls"><button data-move="${card.id}" data-dir="up" aria-label="${escape(card.event)}を上へ" ${index === 0 ? 'disabled' : ''}>↑</button><button data-move="${card.id}" data-dir="down" aria-label="${escape(card.event)}を下へ" ${index === cards.length - 1 ? 'disabled' : ''}>↓</button></div></div>`).join('');
      document.querySelector('#order-result').textContent = cards.map(card => card.letter).join('');
      main.querySelectorAll('[data-move]').forEach(button => button.addEventListener('click', () => {
        const index = cards.findIndex(card => card.id === button.dataset.move);
        const destination = index + (button.dataset.dir === 'up' ? -1 : 1);
        [cards[index], cards[destination]] = [cards[destination], cards[index]];
        drawOrder(button.dataset.move, button.dataset.dir);
      }));
      if (focusId) { const target = main.querySelector(`[data-move="${focusId}"][data-dir="${direction}"]`); if (target && !target.disabled) target.focus(); else main.querySelector(`[data-move="${focusId}"]:not(:disabled)`)?.focus(); }
    }
    drawOrder();
  }
}
// Native dialogs plus a small fallback for older browser versions.
let modalState;
function showDialog(dialog) {
  if (dialog.open) return;
  modalState = { top: window.scrollY, opener: document.activeElement, token: renderId };
  document.body.style.top = `-${modalState.top}px`;
  document.body.classList.add('is-modal-open');
  dialog.returnValue = '';
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else { dialog.setAttribute('open', ''); dialog.classList.add('dialog-fallback'); dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); dialog.querySelector('button:not(:disabled)')?.focus(); }
}
function unlockPage() {
  if (!modalState || document.querySelector('dialog[open]')) return;
  const saved = modalState; modalState = undefined;
  document.body.classList.remove('is-modal-open'); document.body.style.top = '';
  if (saved.token === renderId) { window.scrollTo(0, saved.top); if (saved.opener?.isConnected) saved.opener.focus({ preventScroll: true }); }
}
function closeDialog(dialog, value = '') {
  if (!dialog.open) return;
  if (typeof dialog.close === 'function') dialog.close(value);
  else { dialog.returnValue = value; dialog.removeAttribute('open'); dialog.classList.remove('dialog-fallback'); dialog.dispatchEvent(new Event('close')); }
  unlockPage();
}
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('close', unlockPage));
document.addEventListener('keydown', event => {
  const dialog = document.querySelector('dialog[open]');
  if (!dialog) return;
  if (event.key === 'Escape') { event.preventDefault(); closeDialog(dialog, 'cancel'); }
  if (event.key === 'Tab') {
    const items = [...dialog.querySelectorAll('button:not(:disabled), a[href], [tabindex="0"]')];
    const first = items[0], last = items.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
});
let zoom = 1;
function openImage(src, alt) {
  const image = document.querySelector('#zoom-image'); image.src = src; image.alt = alt;
  zoom = 1; setZoom(); const scroll = document.querySelector('#image-scroll'); scroll.scrollTop = 0; scroll.scrollLeft = 0; showDialog(document.querySelector('#image-dialog'));
}
function setZoom() { document.querySelector('#zoom-image').style.width = `${zoom * 100}%`; document.querySelector('#zoom-label').textContent = `${Math.round(zoom * 100)}%`; document.querySelector('#zoom-out').disabled = zoom <= 1; document.querySelector('#zoom-in').disabled = zoom >= 4; }
document.querySelector('#close-image').addEventListener('click', () => closeDialog(document.querySelector('#image-dialog')));
document.querySelector('#zoom-in').addEventListener('click', () => { zoom = Math.min(4, zoom + .5); setZoom(); });
document.querySelector('#zoom-out').addEventListener('click', () => { zoom = Math.max(1, zoom - .5); setZoom(); });
function confirmAction(title, description, label) {
  return new Promise(resolve => {
    const dialog = document.querySelector('#confirm-dialog');
    document.querySelector('#confirm-title').textContent = title;
    document.querySelector('#confirm-description').textContent = description;
    document.querySelector('#confirm-ok').textContent = label;
    document.querySelector('#confirm-ok').onclick = () => closeDialog(dialog, 'ok');
    document.querySelector('#confirm-cancel').onclick = () => closeDialog(dialog, 'cancel');
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'ok'), { once: true });
    showDialog(dialog);
  });
}
function results() {
  const token = renderId;
  const solved = progress.solved.length;
  const learned = progress.learned.length;
  const resume = nextId();
  main.innerHTML = `<div class="container"><section class="result-hero"><p class="eyebrow">YOUR DISCOVERIES</p><h1>${solved === 8 ? '８つのフラグを、発見。' : solved || learned ? 'その一歩が、あなたの発見。' : '最初のフラグを、見つけに行こう。'}</h1><div class="result-score">${solved}<span> / 8 正解</span></div><p>解説で学習：${learned}問 ／ 未完了：${8 - solved - learned}問<br>ヒントを使って解いた問題も正解に含みます。</p><div class="hero-actions">${resume ? `<a class="btn primary" href="#mission-${resume}">挑戦をつづける →</a>` : '<a class="btn" href="#mission-1">最初の問題を復習する →</a>'}</div></section><div class="result-list">${data.map(c => `<div class="result-row"><span class="num">${String(c.id).padStart(2, '0')}</span><a href="#mission-${c.id}">${escape(c.title)}</a><span class="state">${stateLabel(c.id)}</span></div>`).join('')}<p class="notice">同じブラウザで30日間、進捗を保存します。Cookieの削除や別の端末では引き継がれません。</p><button id="reset-progress" class="reset-btn">この端末の進捗をリセット</button><p id="reset-message" role="status"></p></div>${officialCta()}</div>`;
  document.querySelector('#reset-progress').addEventListener('click', async () => {
    if (!(await confirmAction('進捗をリセットしますか？', 'このブラウザの正解・学習・ヒントの記録を消し、最初から挑戦できる状態に戻します。', 'リセットする'))) return;
    if (token !== renderId) return;
    const button = document.querySelector('#reset-progress');
    if (button.disabled) return;
    button.disabled = true;
    try { await api('reset'); if (token === renderId) await render(); }
    catch (error) { if (token === renderId) document.querySelector('#reset-message').textContent = error.message; }
    finally { if (token === renderId) button.disabled = false; }
  });
}
function about() {
  main.innerHTML = `<div class="container"><article class="about"><p class="eyebrow">ABOUT THIS EXPERIENCE</p><h1>サイバーへの一歩を、もっと身近に。</h1><p>このサイトは「初心者向けWeb練習CTFによる防衛省サイバーコンテスト参加促進プロジェクト」の体験用プロトタイプです。防衛省の公式サービスではありません。問題と調査用の画像・記録は、この体験のために独自に制作した架空の素材です。</p><h2>CTFって何？</h2><p>CTF（Capture The Flag）は、データや画面から手がかりを調べ、答えとなる「フラグ」を探す形式の競技です。この体験では、短い英字の合言葉をフラグとして提出します。コードを書く必要はありません。</p><h2>解けなくても、大丈夫。</h2><p>すべての問題に無料の段階ヒントと解説があります。解説を先に見た問題は「解説で学習」として記録し、自分で解いた正解数と分けます。１問だけの体験でも、未正解でも、大会の案内へ進めます。</p><h2>大会への参加について</h2><p>練習は予選や参加資格の判定ではありません。大会への応募、参加条件、開催日や募集状況は、<a href="${official}" target="_blank" rel="noopener noreferrer">防衛省の公式サイト</a>でご確認ください。このサイトでは応募や個人情報の受付を行いません。</p><h2>進捗とデータについて</h2><p>氏名・メールアドレスの入力は求めません。同じブラウザで再開できるよう、正解・学習・ヒントの状態を必要なCookieに30日間保存します。結果ページからリセットできます。Cookie削除や別の端末では進捗は引き継がれません。アクセスに伴い、ホスティングサービスがIPアドレスなどの運用ログを扱う場合があります。この版では広告や個人を追跡するアクセス解析は導入していません。</p><h2>安全な練習環境</h2><p>調査は、このサイトに用意された画像と架空の記録の中だけで完結します。実在する第三者サイトへのアクセスや攻撃を課題にすることはありません。</p><h2>マスコットについて</h2><p>ライ・リイは、<a href="${official}" target="_blank" rel="noopener noreferrer">防衛省サイバーコンテストのマスコットキャラクター</a>です。本サイトでは提供画像をもとに背景透過加工した素材を使用しています。吹き出しや応援メッセージは、この学生企画のために作成したものです。防衛省の公式サービス・公認を示すものではありません。</p><h2>制作時に参考にした公開資料</h2><ul><li><a href="https://cadets.ctfd.io/how-it-works" target="_blank" rel="noopener noreferrer">Army Cadets CTFの運営FAQ</a>：初心者問題の大部分をスマホのブラウザで解けると説明しています。</li><li><a href="https://ctf.bogus.jp/" target="_blank" rel="noopener noreferrer">おうちCTF</a>：小さな問題とヒントの提示方法を参考にしました。全問題のスマホ対応を確認したものではありません。</li><li><a href="https://www.mod.go.jp/j/approach/defense/cyber/c_contest/previous_exam.html" target="_blank" rel="noopener noreferrer">防衛省サイバーコンテストの過去問紹介</a>：問題の分野と学習内容の説明を参考にしました。</li></ul><p>資料確認日：2026年10月6日。既存問題の文章・画像・フラグは転載していません。</p><a class="btn primary" href="#mission-1">最初のミッションへ →</a></article></div>`;
}
async function render() {
  if (!data) return;
  const token = ++renderId;
  const route = location.hash || '#home';
  closeDialog(document.querySelector('#image-dialog'));
  closeDialog(document.querySelector('#confirm-dialog'), 'cancel');
  window.scrollTo(0, 0);
  if (/^#mission-\d+$/.test(route)) {
    const id = Number(route.split('-')[1]);
    document.title = `${data.find(c => c.id === id)?.title || 'ミッション'} — CYBER FIRST STEP`;
    await mission(id, token);
  } else if (route === '#result') { document.title = '結果・復習 — CYBER FIRST STEP'; results(); }
  else if (route === '#about') { document.title = 'この体験について — CYBER FIRST STEP'; about(); }
  else { document.title = 'CYBER FIRST STEP — スマホでサイバー宝探し'; home(); if (route === '#missions') document.querySelector('#missions-section').scrollIntoView(); }
}
window.addEventListener('hashchange', render);
document.addEventListener('click', event => {
  const link = event.target.closest('a');
  if (link?.classList.contains('skip-link')) { event.preventDefault(); main.focus({ preventScroll: true }); main.scrollIntoView({ behavior: 'auto' }); return; }
  if (link?.href === official) api('official').catch(() => {});
});
window.addEventListener('pageshow', event => { if (event.persisted) initialize(); });
async function initialize() {
  try { const result = await api(); data = result.challenges; await render(); }
  catch (error) { main.innerHTML = `<div class="error-box"><h1>接続を確認しています。</h1><p>${escape(error.message)}</p><button class="btn primary" id="retry">もう一度読み込む</button><p><a href="${official}" target="_blank" rel="noopener noreferrer">大会の公式案内を見る ↗</a></p></div>`; document.querySelector('#retry').addEventListener('click', initialize); }
}
initialize();
