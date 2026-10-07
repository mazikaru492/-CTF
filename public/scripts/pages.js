import { escape, icons, mascot } from './ui.js';
import { material } from './materials.js';
export const official = 'https://www.mod.go.jp/j/approach/defense/cyber/c_contest/';
const previousExam = `${official}previous_exam.html`;

export function stateLabel(id, progress) {
  return progress.solved.includes(id)
    ? '✓ 正解'
    : progress.learned.includes(id)
      ? '解説で学習'
      : progress.viewed.includes(id)
        ? '挑戦中'
        : '未挑戦';
}
export function nextId(data, progress, id = 0) {
  return (
    data.find(
      (c) => c.id > id && !progress.solved.includes(c.id) && !progress.learned.includes(c.id),
    )?.id ||
    data.find((c) => !progress.solved.includes(c.id) && !progress.learned.includes(c.id))?.id
  );
}
function missionCards(data, progress) {
  return data
    .map(
      (c) =>
        /* HTML */ `<a
          class="mission-card ${progress.solved.includes(c.id) ? 'done' : ''} ${progress.learned.includes(c.id) ? 'learned' : ''}"
          href="#mission-${c.id}"
          aria-label="問題${c.id} ${escape(c.title)} ${stateLabel(c.id, progress)} ${progress.solved.includes(c.id) || progress.learned.includes(c.id) ? 'この問題を復習する' : 'この問題に挑戦する'}"
          ><div class="card-top">
            <span class="card-number">問題 ${c.id}</span
            ><span class="card-icon" aria-hidden="true">${icons[c.kind]}</span>
          </div>
          <div>
            <h3>${escape(c.title)}</h3>
            <p>${escape(c.subtitle)}</p>
          </div>
          <div class="card-bottom">
            <span class="category-label">${escape(c.category)}</span
            ><span class="card-status">${stateLabel(c.id, progress)}</span>
          </div>
          <span class="mission-card-action"
            ><span
              >${progress.solved.includes(c.id) || progress.learned.includes(c.id) ? 'この問題を復習する' : 'この問題に挑戦する'}</span
            ><span aria-hidden="true">→</span></span
          ></a
        >`,
    )
    .join('');
}
function officialCta() {
  const links = [
    {
      href: official,
      title: '防衛省サイバーコンテスト',
      description: '防衛省ホームページ ／ www.mod.go.jp',
    },
    {
      href: previousExam,
      title: '過去の問題に挑戦する',
      description: '防衛省の過去問紹介 ／ www.mod.go.jp',
    },
  ];
  return /* HTML */ `<section class="official-cta" aria-label="公式大会の案内">
    <h2>防衛省サイバーコンテストのご案内</h2>
    <div class="official-body">
      <p>暗号やネットワークなど、情報セキュリティに関する問題に挑戦するコンテストです。</p>
      <p>開催情報・参加条件・募集状況は、防衛省ホームページをご確認ください。</p>
      <div class="official-links">
        ${links
          .map(
            (link) =>
              /* HTML */ `<a
                class="official-link"
                href="${link.href}"
                target="_blank"
                rel="noopener noreferrer"
                ><span class="official-link-text"
                  >${link.title}<span class="official-domain">${link.description}</span></span
                ><span class="official-external"
                  >外部サイト
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path
                      d="M14 3h7v7m0-7L10 14M10 5H4a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-6"
                    /></svg></span
              ></a>`,
          )
          .join('')}
      </div>
      <p class="official-note">
        この練習のクリアは、大会の参加条件ではありません。<br />本サイトは学生企画の体験サイトです。
      </p>
    </div>
  </section>`;
}
export function sidebarList(id, data, progress) {
  return /* HTML */ `<ol class="sidebar-list">
    ${data
      .map(
        (c) =>
          /* HTML */ `<li>
            <a
              class="${c.id === id ? 'active' : ''}"
              href="#mission-${c.id}"
              ${c.id === id ? 'aria-current="page"' : ''}
              ><span class="num">${String(c.id).padStart(2, '0')}</span
              ><span>${escape(c.title)}</span
              ><span class="tick" aria-label="${stateLabel(c.id, progress)}"
                >${progress.solved.includes(c.id) ? '✓' : progress.learned.includes(c.id) ? '◇' : '·'}</span
              ></a
            >
          </li>`,
      )
      .join('')}
  </ol>`;
}
export function progressPanel(data, progress) {
  return /* HTML */ `<div class="progress-panel">
    <p>あなたのミッション</p>
    <div class="progress-count">
      <strong>${progress.solved.length}</strong><span>/ ${data.length} 正解</span>
    </div>
    <div
      class="progress-track"
      role="progressbar"
      aria-label="正解した問題数"
      aria-valuenow="${progress.solved.length}"
      aria-valuemin="0"
      aria-valuemax="${data.length}"
    >
      <svg class="progress-fill" viewBox="0 0 100 6" preserveAspectRatio="none" aria-hidden="true">
        <rect width="${(100 * progress.solved.length) / data.length}" height="6" />
      </svg>
    </div>
    <p>解説で学習：${progress.learned.length}問</p>
  </div>`;
}
export function homePage(data, progress) {
  const resume = nextId(data, progress) || 1;
  const hasProgress = progress.solved.length || progress.learned.length || progress.viewed.length;
  return /* HTML */ `<div class="container">
    <section class="hero">
      <div>
        <p class="eyebrow">スマホで体験・はじめてのサイバー宝探し</p>
        <h1><span class="line">そのひらめきが、</span><span class="line">はじめの一歩。</span></h1>
        <p class="hero-copy">
          スマホで、サイバー宝探し。<br />暗号・画像・記録から、答えの合言葉を探そう。<br />この合言葉を「フラグ」と呼びます。<br />専門知識は不要。各問題の「ヒントを見る」から手助けを受けられます。
        </p>
        <div class="hero-actions">
          <a class="btn primary" href="#mission-${resume}"
            >${hasProgress ? '続きの問題を開く' : '1問目に挑戦する'}
            <span class="arrow" aria-hidden="true">→</span></a
          ><a class="btn secondary" href="#missions"
            >問題一覧から選ぶ <span aria-hidden="true">↓</span></a
          ><a class="text-link" href="${official}" target="_blank" rel="noopener noreferrer"
            >大会の公式案内を見る ↗</a
          >
        </div>
        <p class="hero-note">登録・インストール不要。１問だけの挑戦でもOK。</p>
      </div>
      <div class="mascot-welcome">
        <div class="mascot-duo">${mascot('rai')}${mascot('rii')}</div>
        <p class="mascot-greeting">ひらめきを、一緒に見つけよう。</p>
        <p class="mascot-caption">防衛省サイバーコンテストの<br />マスコット「ライ」「リイ」</p>
        <p class="mascot-caption">この体験は学生企画・非公式です。</p>
      </div>
    </section>
    <section class="hero-stats" aria-label="体験の概要">
      <div class="stat">
        <strong>全${data.length}問</strong><span>暗号・画像・証拠・時系列の4分野</span>
      </div>
      <div class="stat"><strong>1〜3分</strong><span>最初の1問にかかる時間の目安</span></div>
      <div class="stat"><strong>ヒント無料</strong><span>全問にヒントと解説付き</span></div>
    </section>
    <section class="intro-strip">
      <div>
        <p class="eyebrow">はじめての方へ</p>
        <h3>遊び方は、３ステップ。</h3>
      </div>
      <div class="steps">
        <div>
          <span class="step-num">01</span><strong>手がかりを調べる</strong>
          <p>画像や記録から、隠された情報を探します。</p>
        </div>
        <div>
          <span class="step-num">02</span><strong>困ったらヒントを見る</strong>
          <p>フラグ提出欄のすぐ下にあるボタンから、２段階のヒントを表示。無料・減点なしです。</p>
        </div>
        <div>
          <span class="step-num">03</span><strong>合言葉を入力する</strong>
          <p>回答欄に入力して「フラグを提出」を押します。解けなくても解説を見て進めます。</p>
        </div>
      </div>
    </section>
    <section id="missions-section">
      <div class="section-head">
        <div>
          <p class="eyebrow">挑戦する問題を選ぶ</p>
          <h2>${data.length === 8 ? '８' : data.length}つの小さな謎を、解き明かそう。</h2>
        </div>
        <p>下の「この問題に挑戦する」を押して開始。迷ったら問題1から。</p>
      </div>
      <div class="missions-grid">${missionCards(data, progress)}</div>
    </section>
    ${officialCta()}
  </div>`;
}
export function mobileMissionNavigation(id, data, progress) {
  const index = data.findIndex((c) => c.id === id);
  const arrow = (direction, target) => {
    const accessible = direction === 'previous' ? '前の問題' : '次の問題';
    const icon = /* HTML */ `<svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="${direction === 'previous' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}" />
    </svg>`;
    return target
      ? /* HTML */ `<a
          class="btn mission-nav-arrow"
          href="#mission-${target.id}"
          aria-label="${accessible}：問題${target.id}へ"
          >${icon}</a
        >`
      : /* HTML */ `<button
          class="btn mission-nav-arrow"
          type="button"
          disabled
          aria-label="${accessible}はありません"
        >
          ${icon}
        </button>`;
  };
  return /* HTML */ `<nav class="mission-nav-row" aria-label="問題の切り替え">
      <div class="mission-nav-current">
        <strong>問題 ${id} / ${data.length}</strong><span>${progress.solved.length}問正解</span>
      </div>
      <div class="mission-nav-controls">
        ${arrow('previous', data[index - 1])}${arrow('next', data[index + 1])}
      </div>
    </nav>
    <details class="mission-picker">
      <summary>問題一覧から選ぶ <span aria-hidden="true">⌄</span></summary>
      ${sidebarList(id, data, progress)}<a class="text-link" href="#result">結果・復習を見る →</a>
    </details>`;
}

export function missionPage(c, data, progress) {
  const id = c.id;
  return /* HTML */ `<div class="container">
    <div class="workspace">
      <aside class="mission-sidebar" aria-label="ミッション一覧">
        ${progressPanel(data, progress)}${sidebarList(id, data, progress)}
        <div class="sidebar-footer">
          <a href="#result">結果・復習を見る →</a>
          <p class="notice">ヒントは無料。<br />１問だけの挑戦でもOK。</p>
        </div>
      </aside>
      <article class="challenge">
        <div class="mobile-missions">${mobileMissionNavigation(id, data, progress)}</div>
        <header class="challenge-header">
          <div class="challenge-topline">
            <span class="challenge-number">問題 ${id} / 全${data.length}問</span>
          </div>
          <h1>${escape(c.title)}</h1>
        </header>
        <h2 class="flow-heading question-heading">
          <span class="flow-number" aria-hidden="true">1</span>問題を読む
        </h2>
        <div class="mission-instruction">${escape(c.instruction)}</div>
        <section id="mission-material" class="material-box" aria-label="調査素材">
          ${material(c)}
        </section>
        <form id="answer-form" class="answer-panel" aria-labelledby="answer-title">
          <h2 id="answer-title" class="flow-heading">
            <span class="flow-number" aria-hidden="true">3</span>合言葉を入力して提出
          </h2>
          <label for="flag-input">合言葉（フラグ）の入力欄</label>
          <div class="answer-row">
            <input
              id="flag-input"
              name="flag"
              type="text"
              placeholder="合言葉を入力"
              maxlength="100"
              autocomplete="off"
              autocapitalize="characters"
              spellcheck="false"
              required
              aria-describedby="input-note feedback"
            /><button id="submit-answer" class="btn primary" type="submit">
              フラグを提出 <span aria-hidden="true">→</span>
            </button>
          </div>
          <p id="input-note" class="input-note">
            大文字・小文字、全角英数字の違いは気にしなくてOK。
          </p>
          <button
            id="material-shortcut"
            class="answer-back"
            type="button"
            aria-controls="mission-material"
          >
            ↑ 手がかりをもう一度見る
          </button>
          <div
            id="feedback"
            class="feedback"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          ></div>
        </form>
        <section class="hints-panel" aria-labelledby="hints-title">
          <div class="hint-actions">
            <div class="hint-guide">
              ${mascot('rii')}
              <div>
                <h2 id="hints-title">困ったら、ここでヒント</h2>
                <p>２段階のヒントでお手伝い。無料・減点なしです。</p>
              </div>
            </div>
            <button id="hint-button" class="btn small" aria-controls="hint-items">
              ヒントを見る（0 / 2）
            </button>
          </div>
          <div id="hint-items" aria-live="polite" aria-atomic="true"></div>
          <p id="hint-feedback" class="hint-feedback" role="status"></p>
        </section>
        <button id="explanation-button" class="explanation-link">
          解けなくても、解説を見て進む →
        </button>
        <section
          id="explanation"
          class="explanation hidden"
          aria-label="問題の解説"
          tabindex="-1"
        ></section>
        <p class="notice">
          練習のクリアは参加条件ではありません。<a
            href="${official}"
            target="_blank"
            rel="noopener noreferrer"
            >大会の公式案内を見る ↗</a
          >
        </p>
      </article>
    </div>
  </div>`;
}

export function resultPage(data, progress) {
  const solved = progress.solved.length;
  const learned = progress.learned.length;
  const resume = nextId(data, progress);
  return /* HTML */ `<div class="container">
    <section class="result-hero">
      <p class="eyebrow">YOUR DISCOVERIES</p>
      <h1>
        ${solved === data.length ? `${data.length === 8 ? '８' : data.length}つのフラグを、発見。` : solved || learned ? 'その一歩が、あなたの発見。' : '最初のフラグを、見つけに行こう。'}
      </h1>
      <div class="result-score">${solved}<span> / ${data.length} 正解</span></div>
      <p>
        解説で学習：${learned}問 ／ 未完了：${data.length - solved - learned}問<br />ヒントを使って解いた問題も正解に含みます。
      </p>
      <div class="hero-actions">
        ${resume ? /* HTML */ `<a class="btn primary" href="#mission-${resume}">挑戦をつづける →</a>` : '<a class="btn" href="#mission-1">最初の問題を復習する →</a>'}
      </div>
    </section>
    <div class="result-list">
      ${data.map((c) => /* HTML */ `<div class="result-row"><span class="num">${String(c.id).padStart(2, '0')}</span><a href="#mission-${c.id}">${escape(c.title)}</a><span class="state">${stateLabel(c.id, progress)}</span></div>`).join('')}
      <p class="notice">
        同じブラウザで30日間、進捗を保存します。Cookieの削除や別の端末では引き継がれません。
      </p>
      <button id="reset-progress" class="reset-btn">この端末の進捗をリセット</button>
      <p id="reset-message" role="status"></p>
    </div>
    ${officialCta()}
  </div>`;
}

export function aboutPage() {
  return /* HTML */ `<div class="container">
    <article class="about">
      <p class="eyebrow">ABOUT THIS EXPERIENCE</p>
      <h1>サイバーへの一歩を、もっと身近に。</h1>
      <p>
        このサイトは「初心者向けWeb練習CTFによる防衛省サイバーコンテスト参加促進プロジェクト」の体験用プロトタイプです。防衛省の公式サービスではありません。問題と調査用の画像・記録は、この体験のために独自に制作した架空の素材です。
      </p>
      <h2>CTFって何？</h2>
      <p>
        CTF（Capture The
        Flag）は、データや画面から手がかりを調べ、答えとなる「フラグ」を探す形式の競技です。この体験では、短い英字の合言葉をフラグとして提出します。コードを書く必要はありません。
      </p>
      <h2>解けなくても、大丈夫。</h2>
      <p>
        すべての問題に無料の段階ヒントと解説があります。解説を先に見た問題は「解説で学習」として記録し、自分で解いた正解数と分けます。１問だけの体験でも、未正解でも、大会の案内へ進めます。
      </p>
      <h2>大会への参加について</h2>
      <p>
        練習は予選や参加資格の判定ではありません。大会への応募、参加条件、開催日や募集状況は、<a
          href="${official}"
          target="_blank"
          rel="noopener noreferrer"
          >防衛省の公式サイト</a
        >でご確認ください。このサイトでは応募や個人情報の受付を行いません。
      </p>
      <h2>進捗とデータについて</h2>
      <p>
        氏名・メールアドレスの入力は求めません。同じブラウザで再開できるよう、正解・学習・ヒントの状態を必要なCookieに30日間保存します。結果ページからリセットできます。Cookie削除や別の端末では進捗は引き継がれません。アクセスに伴い、ホスティングサービスがIPアドレスなどの運用ログを扱う場合があります。この版では広告や個人を追跡するアクセス解析は導入していません。
      </p>
      <h2>安全な練習環境</h2>
      <p>
        調査は、このサイトに用意された画像と架空の記録の中だけで完結します。実在する第三者サイトへのアクセスや攻撃を課題にすることはありません。
      </p>
      <h2>マスコットについて</h2>
      <p>
        ライ・リイは、<a href="${official}" target="_blank" rel="noopener noreferrer"
          >防衛省サイバーコンテストのマスコットキャラクター</a
        >です。本サイトでは提供画像をもとに背景透過加工した素材を使用しています。吹き出しや応援メッセージは、この学生企画のために作成したものです。防衛省の公式サービス・公認を示すものではありません。
      </p>
      <h2>制作時に参考にした公開資料</h2>
      <ul>
        <li>
          <a href="https://cadets.ctfd.io/how-it-works" target="_blank" rel="noopener noreferrer"
            >Army Cadets CTFの運営FAQ</a
          >：初心者問題の大部分をスマホのブラウザで解けると説明しています。
        </li>
        <li>
          <a href="https://ctf.bogus.jp/" target="_blank" rel="noopener noreferrer">おうちCTF</a
          >：小さな問題とヒントの提示方法を参考にしました。全問題のスマホ対応を確認したものではありません。
        </li>
        <li>
          <a href="${previousExam}" target="_blank" rel="noopener noreferrer"
            >防衛省サイバーコンテストの過去問紹介</a
          >：問題の分野と学習内容の説明を参考にしました。
        </li>
      </ul>
      <p>資料確認日：2026年10月6日。既存問題の文章・画像・フラグは転載していません。</p>
      <a class="btn primary" href="#mission-1">最初のミッションへ →</a>
    </article>
  </div>`;
}
