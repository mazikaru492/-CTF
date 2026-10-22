const kinds = new Set([
  'cipher',
  'ascii',
  'image',
  'compare',
  'logs',
  'records',
  'order',
  'final',
  'phishing',
]);
const textFields = [
  'category',
  'title',
  'subtitle',
  'instruction',
  'answer',
  'explanation',
  'learning',
];

const materialFields = {
  cipher: ['cipher'],
  ascii: ['numbers'],
  image: ['image', 'alt', 'textClue', 'textDetail'],
  compare: ['before', 'after', 'beforeAlt', 'afterAlt', 'textClue', 'textDetail'],
  logs: ['logs', 'devices'],
  records: ['current', 'backup'],
  order: ['cards'],
  final: ['image', 'alt', 'textClue', 'textDetail', 'cipher', 'rule'],
  phishing: ['officialDomain', 'emails'],
};

// Authoring errors fail before startup/build, with the exact question and field.
export function validateCatalog(catalog) {
  const fail = (path, message) => {
    throw new Error(`${path}: ${message}`);
  };
  const text = (value, path) => {
    if (typeof value !== 'string' || !value.trim())
      fail(path, '空ではない文字列を入力してください。');
  };
  const array = (value, path) => {
    if (!Array.isArray(value) || !value.length) fail(path, '１件以上の配列が必要です。');
  };
  const image = (value, path) => {
    text(value, path);
    if (
      !value.startsWith('/assets/') ||
      /[\\?#%\u0000-\u001f]/.test(value) ||
      value.split('/').includes('..')
    )
      fail(path, '/assets/から始まる画像パスを指定してください（..は使えません）。');
  };
  const items = (value, path, fields) => {
    array(value, path);
    const ids = new Set();
    value.forEach((item, index) => {
      const itemPath = `${path}[${index}]`;
      if (!item || typeof item !== 'object') fail(itemPath, 'オブジェクトが必要です。');
      fields.forEach((field) => text(item[field], `${itemPath}.${field}`));
      if (!/^[A-Za-z0-9_-]+$/.test(item.id))
        fail(`${itemPath}.id`, 'IDは半角英数字・ハイフン・アンダースコアで指定してください。');
      if (ids.has(item.id)) fail(`${itemPath}.id`, '同じIDが重複しています。');
      ids.add(item.id);
    });
  };
  if (!catalog || !Number.isInteger(catalog.progressVersion) || catalog.progressVersion < 1)
    fail('progressVersion', '１以上の整数が必要です。');
  array(catalog.questions, 'questions');
  // Progress is stored in a signed cookie; keep its size safely bounded.
  if (catalog.questions.length > 32)
    fail('questions', 'Cookieの容量を保つため、問題は32問以内にしてください。');
  catalog.questions.forEach((question, index) => {
    const path = `questions[${index}]（問題${index + 1}）`;
    if (!question || question.id !== index + 1)
      fail(`${path}.id`, '配列順に１からの連番で指定してください。');
    const fields = new Set([...textFields, 'id', 'kind', 'material', 'hints']);
    for (const field of Object.keys(question))
      if (!fields.has(field))
        fail(`${path}.${field}`, '未対応の項目です。項目名を確認してください。');
    textFields.forEach((field) => text(question[field], `${path}.${field}`));
    if (!kinds.has(question.kind)) fail(`${path}.kind`, `対応する形式: ${[...kinds].join(', ')}`);
    if (
      question.answer.length > 100 ||
      question.answer !== question.answer.normalize('NFKC').trim().toUpperCase()
    )
      fail(`${path}.answer`, '100文字以内・半角大文字・前後の空白なしで指定してください。');
    if (!Array.isArray(question.hints) || question.hints.length !== 2)
      fail(`${path}.hints`, 'ヒントは２つ指定してください。');
    question.hints.forEach((hint, i) => text(hint, `${path}.hints[${i}]`));
    const material = question.material;
    if (!material || typeof material !== 'object' || Array.isArray(material))
      fail(`${path}.material`, '素材のオブジェクトが必要です。');
    const prefix = `${path}.material`;
    for (const field of Object.keys(material))
      if (!materialFields[question.kind].includes(field))
        fail(`${prefix}.${field}`, 'この問題形式では使わない項目です。項目名を確認してください。');
    for (const field of ['beforeAlt', 'afterAlt'])
      if (field in material) text(material[field], `${prefix}.${field}`);
    if (['cipher', 'final'].includes(question.kind)) {
      text(material.cipher, `${prefix}.cipher`);
      if (!/^[A-Z]+$/.test(material.cipher))
        fail(`${prefix}.cipher`, '暗号は半角英大文字で指定してください。');
    }
    if (question.kind === 'ascii') {
      array(material.numbers, `${prefix}.numbers`);
      if (material.numbers.some((n) => !Number.isInteger(n) || n < 65 || n > 90))
        fail(`${prefix}.numbers`, '対応表にある65〜90の整数を指定してください。');
    }
    if (['image', 'final'].includes(question.kind)) {
      image(material.image, `${prefix}.image`);
      ['alt', 'textClue', 'textDetail'].forEach((field) =>
        text(material[field], `${prefix}.${field}`),
      );
    }
    if (question.kind === 'compare') {
      ['before', 'after'].forEach((field) => image(material[field], `${prefix}.${field}`));
      ['textClue', 'textDetail'].forEach((field) => text(material[field], `${prefix}.${field}`));
    }
    if (question.kind === 'logs') {
      items(material.devices, `${prefix}.devices`, ['id', 'code']);
      array(material.logs, `${prefix}.logs`);
      material.logs.forEach((log, i) => {
        ['time', 'device', 'result'].forEach((field) =>
          text(log?.[field], `${prefix}.logs[${i}].${field}`),
        );
        if (!material.devices.some((device) => device.id === log.device))
          fail(`${prefix}.logs[${i}].device`, 'devicesにある端末IDを指定してください。');
      });
    }
    if (question.kind === 'records') {
      items(material.backup, `${prefix}.backup`, ['id', 'code']);
      array(material.current, `${prefix}.current`);
      material.current.forEach((id, i) => {
        text(id, `${prefix}.current[${i}]`);
        if (!material.backup.some((record) => record.id === id))
          fail(`${prefix}.current[${i}]`, 'backupにあるIDを指定してください。');
      });
    }
    if (question.kind === 'order') {
      items(material.cards, `${prefix}.cards`, ['id', 'time', 'event', 'letter']);
      material.cards.forEach((card, i) => {
        if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(card.time))
          fail(`${prefix}.cards[${i}].time`, '00:00〜23:59のHH:mm形式で指定してください。');
        if (!/^[A-Z]$/.test(card.letter))
          fail(`${prefix}.cards[${i}].letter`, '半角英大文字１文字を指定してください。');
      });
    }
    if (question.kind === 'final') text(material.rule, `${prefix}.rule`);
    if (question.kind === 'phishing') {
      const trainingDomain = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+example$/;
      text(material.officialDomain, `${prefix}.officialDomain`);
      if (!trainingDomain.test(material.officialDomain))
        fail(`${prefix}.officialDomain`, '.exampleで終わる架空のドメインを指定してください。');
      items(material.emails, `${prefix}.emails`, ['id', 'sender', 'url']);
      material.emails.forEach((mail, i) => {
        const path = `${prefix}.emails[${i}]`;
        const address = mail.sender.split('@');
        if (
          address.length !== 2 ||
          !address[0] ||
          /\s/.test(mail.sender) ||
          !trainingDomain.test(address[1])
        )
          fail(`${path}.sender`, '.exampleのドメインを使うメールアドレスを指定してください。');
        let url;
        try {
          url = new URL(mail.url);
        } catch {
          fail(`${path}.url`, '正しいURLを指定してください。');
        }
        if (
          url.protocol !== 'https:' ||
          !trainingDomain.test(url.hostname) ||
          url.username ||
          url.password ||
          url.port
        )
          fail(`${path}.url`, '.exampleのドメインを使うHTTPSのURLを指定してください。');
      });
    }
  });
  return catalog;
}
