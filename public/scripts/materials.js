import { escape } from './ui.js';

export function material(c) {
  const m = c.material;
  const label = /* HTML */ `<h2 class="material-label flow-heading">
    <span class="flow-number" aria-hidden="true">2</span>手がかりを調べる
  </h2>`;
  const alphabet = /* HTML */ `<div class="alphabet" aria-label="アルファベット対応表">
    ${[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((l) => /* HTML */ `<span>${l}</span>`).join('')}
  </div>`;
  const cipher = (text) =>
    /* HTML */ `<div class="cipher" aria-label="暗号 ${escape(text)}">
      ${[...text].map((l) => /* HTML */ `<span>${l}</span>`).join('')}
    </div>`;
  const imageButton = (src, alt) =>
    /* HTML */ `<button
        class="image-open"
        data-image="${escape(src)}"
        data-alt="${escape(alt)}"
        aria-label="調査画像を拡大する"
      >
        <img src="${escape(src)}" alt="${escape(alt)}" />
      </button>
      <p class="image-action">⊕ タップして拡大・調査</p>`;
  const textClue = () =>
    /* HTML */ `<details class="text-clue">
      <summary>${escape(m.textClue)}（画像が見づらいとき）</summary>
      <p>${escape(m.textDetail)}</p>
    </details>`;
  const codeCopy = (subject) =>
    /* HTML */ `<div class="code-copy">
      <button id="copy-selected-code" class="btn secondary" type="button" disabled>
        選んだコードをコピー
      </button>
      <p id="copy-code-status" class="material-tip" role="status">
        ${subject}を選んでからコピーできます。
      </p>
    </div>`;
  if (c.kind === 'cipher')
    return /* HTML */ `${label}${cipher(m.cipher)}${alphabet}
      <p class="material-tip">文字を「１つ前」へ戻してみよう。</p>`;
  if (c.kind === 'ascii')
    return /* HTML */ `${label}
      <div class="number-strip" aria-label="通信記録 ${m.numbers.join(' ')}">
        ${m.numbers.map((n) => /* HTML */ `<span>${n}</span>`).join('')}
      </div>
      <div class="ascii-grid" aria-label="ASCII対応表">
        ${[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((l, i) => /* HTML */ `<div class="ascii-cell"><b>${l}</b><small>${65 + i}</small></div>`).join('')}
      </div>
      <p class="material-tip">数字と一致する英字を順番に読もう。</p>`;
  if (c.kind === 'image') return /* HTML */ `${label}${imageButton(m.image, m.alt)}${textClue()}`;
  if (c.kind === 'compare')
    return /* HTML */ `${label}
      <div class="segmented">
        <button data-compare="before" aria-pressed="true">変更前</button
        ><button data-compare="after" aria-pressed="false">変更後</button>
      </div>
      ${imageButton(m.before, m.beforeAlt || '変更前の掲示板')}
      <p id="compare-caption" class="material-tip" aria-live="polite">変更前の掲示板を表示中</p>
      ${textClue()}`;
  if (c.kind === 'logs')
    return /* HTML */ `${label}
      <div class="log-head"><span>時刻</span><span>端末</span><span>結果</span></div>
      ${m.logs.map((l) => /* HTML */ `<div class="log-row"><span>${escape(l.time)}</span><span>端末 ${escape(l.device)}</span><span class="${l.result === '失敗' ? 'failure' : ''}">${escape(l.result)}</span></div>`).join('')}
      <p class="material-tip">調べる端末をタップしてコードを確認</p>
      <div class="device-grid">
        ${m.devices.map((d) => /* HTML */ `<button class="device-btn" data-device="${escape(d.id)}" aria-pressed="false"><span>端末 ${escape(d.id)}</span><span class="device-code">コードを見る</span></button>`).join('')}
      </div>
      <p id="device-detail" class="material-tip" aria-live="polite"></p>
      ${codeCopy('端末')}`;
  if (c.kind === 'records')
    return /* HTML */ `${label}
      <p class="material-label">現在の一覧</p>
      <div class="record-list">
        ${m.current.map((id) => /* HTML */ `<span>${escape(id)}</span>`).join('')}
      </div>
      <p class="material-label">バックアップ</p>
      <div class="device-grid">
        ${m.backup.map((d) => /* HTML */ `<button class="device-btn" data-record="${escape(d.id)}" aria-pressed="false"><span>${escape(d.id)}</span><span class="device-code">開いて調べる</span></button>`).join('')}
      </div>
      <p id="record-detail" class="material-tip" aria-live="polite"></p>
      ${codeCopy('カード')}`;
  if (c.kind === 'order')
    return /* HTML */ `${label}
      <div id="order-list" class="order-list"></div>
      <p class="material-tip">時刻順に並べ、文字を上から読もう。</p>
      <p class="order-result" id="order-result" aria-live="polite"></p>`;
  if (c.kind === 'phishing')
    return /* HTML */ `${label}
      <div class="email-rule">
        <strong>公式ドメイン：<code>${escape(m.officialDomain)}</code></strong>
        <p>送信元とリンク先のドメインを、公式ドメインと見比べよう。</p>
      </div>
      <p class="email-note">すべて架空の練習用メールです。URLは開かず、文字を見比べて調べます。</p>
      <ol class="email-list" role="list" aria-label="届いたメール">
        ${m.emails
          .map(
            (mail) =>
              /* HTML */ `<li class="email-card">
                <h3>メール ${escape(mail.id)}</h3>
                <p class="email-subject">大会事務局からのお知らせ</p>
                <dl class="email-fields">
                  <div>
                    <dt>送信元</dt>
                    <dd><code>${escape(mail.sender)}</code></dd>
                  </div>
                  <div>
                    <dt>リンク先URL</dt>
                    <dd><code>${escape(mail.url)}</code></dd>
                  </div>
                </dl>
              </li>`,
          )
          .join('')}
      </ol>`;
  if (c.kind === 'final')
    return /* HTML */ `${label}${imageButton(m.image, m.alt)}${textClue()}
      <p class="rule"><strong>調査記録</strong><br />${escape(m.rule)}</p>
      ${cipher(m.cipher)}${alphabet}`;
  return '';
}
export function setupMaterials(c, main, openImage) {
  main
    .querySelectorAll('[data-image]')
    .forEach((button) =>
      button.addEventListener('click', () =>
        openImage(button.dataset.image, button.dataset.alt, button),
      ),
    );
  if (c.kind === 'compare') {
    main.querySelectorAll('[data-compare]').forEach((button) =>
      button.addEventListener('click', () => {
        const before = button.dataset.compare === 'before';
        main
          .querySelectorAll('[data-compare]')
          .forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
        const image = main.querySelector('.image-open');
        const src = before ? c.material.before : c.material.after;
        const alt = before
          ? c.material.beforeAlt || '変更前の掲示板'
          : c.material.afterAlt || '変更後の掲示板';
        image.dataset.image = src;
        image.dataset.alt = alt;
        image.querySelector('img').src = src;
        image.querySelector('img').alt = alt;
        main.querySelector('#compare-caption').textContent =
          `${before ? '変更前' : '変更後'}の掲示板を表示中`;
      }),
    );
  }
  const copyButton = main.querySelector('#copy-selected-code');
  const copyStatus = main.querySelector('#copy-code-status');
  copyButton?.addEventListener('click', async () => {
    const code = copyButton.dataset.code;
    copyButton.disabled = true;
    copyStatus.textContent = 'コピーしています…';
    try {
      await navigator.clipboard.writeText(code);
      if (copyButton.dataset.code === code)
        copyStatus.textContent = `${code} をコピーしました。下の入力欄に貼り付けてください。`;
    } catch {
      if (copyButton.dataset.code === code)
        copyStatus.textContent =
          'コピーできませんでした。上のコードを長押ししてコピーしてください。';
    } finally {
      if (copyButton.dataset.code === code) copyButton.disabled = false;
    }
  });
  const selectable =
    c.kind === 'logs'
      ? { attr: 'device', items: c.material.devices, output: '#device-detail' }
      : c.kind === 'records'
        ? { attr: 'record', items: c.material.backup, output: '#record-detail' }
        : null;
  if (selectable)
    main.querySelectorAll(`[data-${selectable.attr}]`).forEach((button) =>
      button.addEventListener('click', () => {
        const item = selectable.items.find((d) => d.id === button.dataset[selectable.attr]);
        main
          .querySelectorAll(`[data-${selectable.attr}]`)
          .forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
        main.querySelector(selectable.output).textContent = `${item.id} のコード：${item.code}`;
        button.querySelector('.device-code').textContent = item.code;
        if (copyButton) {
          copyButton.dataset.code = item.code;
          copyButton.disabled = false;
          copyStatus.textContent = '下の入力欄に貼り付けて使えます。';
        }
      }),
    );
  if (c.kind === 'order') {
    let cards = [...c.material.cards];
    function drawOrder(focusId, direction) {
      main.querySelector('#order-list').innerHTML = cards
        .map(
          (card, index) =>
            /* HTML */ `<div class="order-card">
              <span class="order-letter">${card.letter}</span>
              <div class="order-info"><time>${card.time}</time>${escape(card.event)}</div>
              <div class="order-controls">
                <button
                  data-move="${card.id}"
                  data-dir="up"
                  aria-label="${escape(card.event)}を上へ"
                  ${index === 0 ? 'disabled' : ''}
                >
                  ↑</button
                ><button
                  data-move="${card.id}"
                  data-dir="down"
                  aria-label="${escape(card.event)}を下へ"
                  ${index === cards.length - 1 ? 'disabled' : ''}
                >
                  ↓
                </button>
              </div>
            </div>`,
        )
        .join('');
      main.querySelector('#order-result').textContent = cards.map((card) => card.letter).join('');
      main.querySelectorAll('[data-move]').forEach((button) =>
        button.addEventListener('click', () => {
          const index = cards.findIndex((card) => card.id === button.dataset.move);
          const destination = index + (button.dataset.dir === 'up' ? -1 : 1);
          [cards[index], cards[destination]] = [cards[destination], cards[index]];
          drawOrder(button.dataset.move, button.dataset.dir);
        }),
      );
      if (focusId) {
        const target = main.querySelector(`[data-move="${focusId}"][data-dir="${direction}"]`);
        if (target && !target.disabled) target.focus();
        else main.querySelector(`[data-move="${focusId}"]:not(:disabled)`)?.focus();
      }
    }
    drawOrder();
  }
}
