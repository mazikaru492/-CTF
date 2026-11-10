import { escape, mascot, character, animateResult } from './scripts/ui.js';
import { setupMaterials } from './scripts/materials.js';
import { createDialogs } from './scripts/dialogs.js';
import {
  official,
  nextId,
  homePage,
  missionPage,
  resultPage,
  aboutPage,
  progressPanel,
  sidebarList,
  mobileMissionNavigation,
} from './scripts/pages.js';

const main = document.querySelector('#main');
let data;
let progress;
let catalogVersion;
let renderId = 0;
const { openImage, confirmAction, closeAll } = createDialogs(() => renderId);
let queue = Promise.resolve();
async function api(action, id, extra = {}) {
  const request = async () => {
    const source = new URLSearchParams(location.search).get('source');
    const url =
      '/api/game' +
      (!action && ['school', 'x', 'event'].includes(source) ? `?source=${source}` : '');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        ...(action
          ? {
              method: 'POST',
              keepalive: action === 'official',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action, id, catalogVersion, ...extra }),
            }
          : {}),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '接続できませんでした。');
      if (result.catalogVersion !== undefined) catalogVersion = result.catalogVersion;
      if (result.progress) {
        progress = result.progress;
        updateScore();
      }
      return result;
    } catch (error) {
      if (error.name === 'AbortError')
        throw new Error('通信に時間がかかっています。接続を確認して、もう一度お試しください。');
      if (error instanceof TypeError || error instanceof SyntaxError)
        throw new Error('接続できませんでした。通信環境を確認して、もう一度お試しください。');
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  };
  const task = queue.then(() =>
    navigator.locks ? navigator.locks.request('ctf-progress', request) : request(),
  );
  queue = task.catch(() => {});
  return task;
}
function updateScore() {
  if (!progress || !data) return;
  document.querySelector('#header-score').textContent =
    `${progress.solved.length} / ${data.length}`;
  document.querySelector('.site-header a[href="#missions"]').textContent =
    `${data.length === 8 ? '８' : data.length}つのミッション`;
}
async function mission(id, token) {
  const c = data.find((c) => c.id === id);
  if (!c) {
    location.hash = '#home';
    return;
  }
  main.innerHTML = missionPage(c, data, progress);
  setupMaterials(c, main, openImage);
  const input = document.querySelector('#flag-input');
  document.querySelector('#material-shortcut').addEventListener('click', () => {
    input.blur();
    const heading = document.querySelector('#mission-material .flow-heading');
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
    document
      .querySelector('#mission-material')
      .scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  input.setAttribute('inputmode', 'text');
  input.setAttribute('enterkeyhint', 'send');
  input.setAttribute('autocorrect', 'off');
  let composing = false;
  let compositionEnded = 0;
  input.addEventListener('compositionstart', () => {
    composing = true;
  });
  input.addEventListener('compositionend', () => {
    composing = false;
    compositionEnded = performance.now();
  });
  input.addEventListener('keydown', (event) => {
    if (
      event.key === 'Enter' &&
      (event.isComposing ||
        composing ||
        event.keyCode === 229 ||
        performance.now() - compositionEnded < 100)
    )
      event.preventDefault();
  });
  document.querySelector('#answer-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = document.querySelector('#submit-answer');
    if (composing || button.disabled) return;
    const feedback = document.querySelector('#feedback');
    const value = document.querySelector('#flag-input').value;
    button.disabled = true;
    button.textContent = '確認しています…';
    feedback.className = 'feedback';
    feedback.textContent = '回答を確認しています…';
    document.querySelector('#answer-form').classList.remove('answer-correct', 'answer-incorrect');
    input.removeAttribute('aria-invalid');
    try {
      const result = await api('answer', id, { answer: value });
      if (token !== renderId) return;
      feedback.textContent = result.correct
        ? result.assisted
          ? '✓ 答えを確認できました。解説で学習した問題です。'
          : '✓ 正解！フラグを発見しました。'
        : '';
      feedback.className = result.correct ? 'feedback success' : 'feedback retry';
      if (!result.correct)
        feedback.innerHTML = `${mascot('rii', 'mascot-retry')}<span><strong>もう一歩！</strong><span>今回は不正解です。入力した合言葉と手がかりを、もう一度見比べてみよう。下のヒントも使えます。</span></span>`;
      document
        .querySelector('#answer-form')
        .classList.add(result.correct ? 'answer-correct' : 'answer-incorrect');
      if (!result.correct) input.setAttribute('aria-invalid', 'true');
      refreshProgress(id);
      if (result.correct) {
        input.blur();
        showExplanation(c, result, true);
      }
      animateResult(result.correct);
    } catch (error) {
      if (token === renderId) {
        feedback.textContent = error.message;
        feedback.className = 'feedback error';
      }
    } finally {
      if (token === renderId) {
        button.disabled = false;
        button.innerHTML = 'フラグを提出 <span aria-hidden="true">→</span>';
      }
    }
  });
  document.querySelector('#hint-items').addEventListener('click', (event) => {
    const button = event.target.closest('[data-hint-action]');
    if (!button) return;
    const item = button.closest('.hint-item');
    const close = button.dataset.hintAction === 'close';
    item.querySelector('.hint-card').classList.toggle('hidden', close);
    const reopen = item.querySelector('.hint-reopen');
    reopen.classList.toggle('hidden', !close);
    reopen.setAttribute('aria-expanded', String(!close));
    (close ? reopen : item.querySelector('.hint-close')).focus({ preventScroll: true });
  });
  document.querySelector('#hint-button').addEventListener('click', async () => {
    const button = document.querySelector('#hint-button');
    button.disabled = true;
    document.querySelector('#hint-feedback').textContent = '';
    try {
      const result = await api('hint', id);
      if (token === renderId) {
        showHints(result.hints, false);
        document.querySelector('.hint-item:last-child .hint-close').focus({ preventScroll: true });
      }
    } catch (error) {
      if (token === renderId) document.querySelector('#hint-feedback').textContent = error.message;
    } finally {
      if (token === renderId) button.disabled = progress.hints[id - 1] >= 2;
    }
  });
  document.querySelector('#explanation-button').addEventListener('click', async (event) => {
    const alreadySolved = progress.solved.includes(id);
    if (
      !alreadySolved &&
      !(await confirmAction(
        '解説を見ますか？',
        '答えと解き方を表示します。この問題は「解説で学習」として記録され、自分で解いた正解数には含めません。',
        '解説を見る',
        event.currentTarget,
      ))
    )
      return;
    if (token !== renderId) return;
    try {
      const result = await api('explanation', id);
      if (token === renderId) {
        refreshProgress(id);
        showExplanation(c, result, true);
      }
    } catch (error) {
      if (token === renderId) document.querySelector('#feedback').textContent = error.message;
    }
  });
  try {
    const [, saved] = await Promise.all([api('view', id), api('restore', id)]);
    if (token !== renderId) return;
    showHints(saved.hints || []);
    if (saved.explanation && document.querySelector('#explanation').classList.contains('hidden'))
      showExplanation(c, saved, false);
    refreshProgress(id);
  } catch (error) {
    if (token === renderId) document.querySelector('#feedback').textContent = error.message;
  }
}
function refreshProgress(id) {
  const sidebar = document.querySelector('.mission-sidebar');
  if (sidebar)
    sidebar.innerHTML = `${progressPanel(data, progress)}${sidebarList(id, data, progress)}<div class="sidebar-footer"><a href="#result">結果・復習を見る →</a><p class="notice">ヒントは無料。１問だけでもOK。</p></div>`;
  const mobile = document.querySelector('.mobile-missions');
  if (mobile) {
    const open = mobile.querySelector('.mission-picker').open;
    mobile.innerHTML = mobileMissionNavigation(id, data, progress);
    mobile.querySelector('.mission-picker').open = open;
  }
}
function showHints(hints, initiallyClosed = true) {
  const items = document.querySelector('#hint-items');
  const closed = new Set([...items.querySelectorAll('.hint-card.hidden')].map((card) => card.id));
  items.classList.toggle('hidden', hints.length === 0);
  items.innerHTML = hints
    .map((hint, i) => {
      const id = `hint-card-${i + 1}`;
      const hidden = initiallyClosed || closed.has(id);
      return /* HTML */ `<div class="hint-item">
        <button
          type="button"
          class="hint-reopen${hidden ? '' : ' hidden'}"
          data-hint-action="open"
          aria-label="ヒント ${i + 1}を開く"
          aria-controls="${id}"
          aria-expanded="${!hidden}"
        >
          <span class="hint-number" aria-hidden="true">0${i + 1}</span>
          <span>ヒント ${i + 1}を開く</span>
          <span class="hint-open-icon" aria-hidden="true">＋</span>
        </button>
        <div id="${id}" class="hint-card${hidden ? ' hidden' : ''}">
          <div class="hint-card-heading">
            <span class="hint-number" aria-hidden="true">0${i + 1}</span>
            <strong>ヒント ${i + 1}</strong>
            <button
              type="button"
              class="hint-close"
              data-hint-action="close"
              aria-label="ヒント ${i + 1}を閉じる"
              aria-controls="${id}"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
          <p class="hint-body">${escape(hint)}</p>
        </div>
      </div>`;
    })
    .join('');
  const button = document.querySelector('#hint-button');
  button.textContent = hints.length === 0 ? 'ヒントを開く ＋' : 'ヒント２を開く ＋';
  button.disabled = hints.length >= 2;
  button.classList.toggle('hidden', hints.length >= 2);
}
function showExplanation(c, result, shouldFocus) {
  const el = document.querySelector('#explanation');
  const next = nextId(data, progress, c.id);
  const celebration =
    progress.solved.length === data.length ? 'duo-jump' : c.id % 2 ? 'rai-jump' : 'rii-jump';
  el.classList.remove('hidden');
  el.innerHTML = /* HTML */ `<div
      class="result-visual ${result.assisted ? 'is-learned' : 'is-correct'}"
    >
      ${character(result.assisted ? 'rii-wave' : celebration, result.assisted ? '' : 'mascot-success', true)}
      <div>
        <span class="result-symbol" aria-hidden="true"
          >${
            result.assisted
              ? '<img src="/assets/book-open.svg" width="28" height="28" alt="" />'
              : '✓'
          }</span
        >
        <p class="eyebrow">${result.assisted ? '解説で学習' : '正解！'}</p>
        <h2>${result.assisted ? '新しい発見を、次の一歩へ。' : 'フラグを発見！'}</h2>
        <p>${result.assisted ? '答えの理由を、一緒に確認しよう。' : 'いいひらめきだね！'}</p>
      </div>
      ${shouldFocus && !result.assisted ? '<div class="confetti" aria-hidden="true">' + '<i></i>'.repeat(12) + '</div>' : ''}
    </div>
    <div class="answer-display">${escape(result.answer)}</div>
    <p>${escape(result.explanation)}</p>
    <p class="learning"><strong>この問題で学べること</strong><br />${escape(result.learning)}</p>
    <div class="next-actions">
      ${next ? /* HTML */ `<a class="btn primary" href="#mission-${next}">次のミッションへ →</a>` : '<a class="btn primary" href="#result">体験の結果を見る →</a>'}<a
        class="btn"
        href="#result"
        >結果・復習</a
      >
    </div>`;
  if (shouldFocus) {
    el.focus({ preventScroll: true });
    el.scrollIntoView({
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    });
  }
}
function results() {
  const token = renderId;
  main.innerHTML = resultPage(data, progress);
  document.querySelector('#reset-progress').addEventListener('click', async (event) => {
    if (
      !(await confirmAction(
        '進捗をリセットしますか？',
        'このブラウザの正解・学習・ヒントの記録を消し、最初から挑戦できる状態に戻します。',
        'リセットする',
        event.currentTarget,
      ))
    )
      return;
    if (token !== renderId) return;
    const button = document.querySelector('#reset-progress');
    if (button.disabled) return;
    button.disabled = true;
    try {
      await api('reset');
      if (token === renderId) await render();
    } catch (error) {
      if (token === renderId) document.querySelector('#reset-message').textContent = error.message;
    } finally {
      if (token === renderId) button.disabled = false;
    }
  });
}
async function render() {
  if (!data) return;
  const token = ++renderId;
  const route = location.hash || '#home';
  closeAll();
  let pendingMission;
  if (/^#mission-\d+$/.test(route)) {
    const id = Number(route.split('-')[1]);
    document.title = `${data.find((c) => c.id === id)?.title || 'ミッション'} — CYBER FIRST STEP`;
    pendingMission = mission(id, token);
  } else if (route === '#result') {
    document.title = '結果・復習 — CYBER FIRST STEP';
    results();
  } else if (route === '#about') {
    document.title = 'この体験について — CYBER FIRST STEP';
    main.innerHTML = aboutPage();
  } else {
    document.title = 'CYBER FIRST STEP — スマホでサイバー宝探し';
    main.innerHTML = homePage(data, progress);
    if (route === '#missions') document.querySelector('#missions-section').scrollIntoView();
  }
  if (route !== '#missions')
    requestAnimationFrame(() => {
      if (token === renderId) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    });
  await pendingMission;
}
window.addEventListener('hashchange', render);
document.addEventListener('click', (event) => {
  const link = event.target.closest('a');
  if (link?.classList.contains('skip-link')) {
    event.preventDefault();
    main.focus({ preventScroll: true });
    main.scrollIntoView({ behavior: 'auto' });
    return;
  }
  if (
    link?.getAttribute('href') === location.hash &&
    event.button === 0 &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    !event.altKey
  ) {
    event.preventDefault();
    if (location.hash === '#missions') document.querySelector('#missions-section').scrollIntoView();
    else window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }
  if (link?.href === official) api('official').catch(() => {});
});
window.addEventListener('pageshow', (event) => {
  if (event.persisted) initialize();
});
async function initialize() {
  try {
    const result = await api();
    data = result.challenges;
    updateScore();
    await render();
  } catch (error) {
    main.innerHTML = /* HTML */ `<div class="error-box">
      <h1>接続を確認しています。</h1>
      <p>${escape(error.message)}</p>
      <button class="btn primary" id="retry">もう一度読み込む</button>
      <p>
        <a href="${official}" target="_blank" rel="noopener noreferrer">大会の公式案内を見る ↗</a>
      </p>
    </div>`;
    document.querySelector('#retry').addEventListener('click', initialize);
  }
}
initialize();
