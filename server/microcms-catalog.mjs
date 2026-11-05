import { createHash, createHmac } from 'node:crypto';
import baseline from './content-baseline.json' with { type: 'json' };
import { validateCatalog } from './validate-content.mjs';

const textFields = [
  'category',
  'title',
  'subtitle',
  'instruction',
  'answer',
  'explanation',
  'learning',
];
const imageFields = ['alt', 'textClue', 'textDetail'];
const localImages = new Set(baseline.localImages);
const pick = (item, fields) => Object.fromEntries(fields.map((key) => [key, item?.[key]]));
const words = (value) => (typeof value === 'string' ? value.trim().split(/[\s,、]+/) : []);
function rows(value, kind, fields) {
  if (!Array.isArray(value) || value.length > 128 || value.some((row) => row?.fieldId !== kind))
    throw new Error('素材の行の形式が正しくありません。');
  return value.map((row) => ({
    ...(fields.includes('id') ? { id: row.itemId } : {}),
    ...pick(
      row,
      fields.filter((f) => f !== 'id'),
    ),
  }));
}
function image(block, name) {
  if (block[name]?.url) return block[name].url;
  const path = block[`${name}Path`];
  if (!localImages.has(path))
    throw new Error('画像を選択するか、移行済みの既存画像パスを指定してください。');
  return path;
}
function convertMaterial(block) {
  switch (block.fieldId) {
    case 'cipher':
      return { cipher: block.cipher };
    case 'ascii':
      return {
        numbers: words(block.numbers).map((value) => (/^\d+$/.test(value) ? Number(value) : NaN)),
      };
    case 'image':
      return { image: image(block, 'image'), ...pick(block, imageFields) };
    case 'compare':
      return {
        before: image(block, 'before'),
        after: image(block, 'after'),
        ...(block.beforeAlt ? { beforeAlt: block.beforeAlt } : {}),
        ...(block.afterAlt ? { afterAlt: block.afterAlt } : {}),
        ...pick(block, ['textClue', 'textDetail']),
      };
    case 'logs':
      return {
        logs: rows(block.logs, 'logRow', ['time', 'device', 'result']),
        devices: rows(block.devices, 'codeRow', ['id', 'code']),
      };
    case 'records':
      return {
        current: words(block.current),
        backup: rows(block.backup, 'codeRow', ['id', 'code']),
      };
    case 'order':
      return { cards: rows(block.cards, 'timeRow', ['id', 'time', 'event', 'letter']) };
    case 'phishing':
      return {
        officialDomain: block.officialDomain,
        emails: rows(block.emails, 'emailRow', ['id', 'sender', 'url']),
      };
    case 'final':
      return { image: image(block, 'image'), ...pick(block, [...imageFields, 'cipher', 'rule']) };
    default:
      throw new Error('未対応の問題形式です。');
  }
}

export function fromMicrocmsQuestions(
  contents,
  { versionKey = process.env.CTF_SESSION_SECRET } = {},
) {
  if (!Array.isArray(contents) || !contents.length || contents.length > 32)
    throw new Error('公開する問題を1〜32問登録してください。');
  const questions = contents
    .map((item) => {
      if (
        !item ||
        !item.publishedAt ||
        !Number.isFinite(Date.parse(item.publishedAt)) ||
        !Array.isArray(item.material) ||
        item.material.length !== 1 ||
        !item.material[0]
      )
        throw new Error('公開済みの問題に素材を1つ設定してください。');
      return {
        id: item.questionNumber,
        category: item.category,
        kind: item.material[0].fieldId,
        ...pick(
          item,
          textFields.filter((f) => f !== 'category'),
        ),
        material: convertMaterial(item.material[0]),
        hints: [item.hint1, item.hint2],
      };
    })
    .sort((a, b) => a.id - b.id);
  // Retain existing progress using a private fingerprint, without embedding problem text.
  const serialized = JSON.stringify(questions);
  const unchanged = createHash('sha256').update(serialized).digest('hex') === baseline.sha256;
  if (!unchanged && (typeof versionKey !== 'string' || versionKey.length < 32))
    throw new Error('問題版の署名に使うCTF_SESSION_SECRETを設定してください。');
  const progressVersion = unchanged
    ? baseline.progressVersion
    : 3 +
      Number.parseInt(
        createHmac('sha256', versionKey).update(serialized).digest('hex').slice(0, 12),
        16,
      );
  return validateCatalog({ progressVersion, questions });
}
