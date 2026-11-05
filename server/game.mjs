import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { normalizeAnswer, publicChallenges } from './challenges.mjs';
import { getCatalog } from './catalog.mjs';

const maxAge = 30 * 86400;
const cookieName = 'ctf_progress';
function secret() {
  const key = process.env.CTF_SESSION_SECRET;
  if (!key || key.length < 32) throw new Error('CTF_SESSION_SECRET must be configured');
  return key;
}
function sign(payload) {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}
export function encodeState(state) {
  const payload = Buffer.from(JSON.stringify(state)).toString('base64url');
  return `${payload}.${sign(payload)}`;
}
export function decodeState(cookie, now = Date.now(), catalog) {
  const challengeCount = catalog.questions.length;
  const progressVersion = catalog.progressVersion;
  try {
    const [payload, signature, extra] = cookie.split('.');
    if (extra || !payload || !signature || payload.length > 3500) return null;
    const expected = Buffer.from(sign(payload));
    const received = Buffer.from(signature);
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
    const state = JSON.parse(Buffer.from(payload, 'base64url').toString());
    const replaceQuestion8 = progressVersion === 2 && state.v === 1;
    if (
      (state.v !== progressVersion && !replaceQuestion8) ||
      !Number.isFinite(state.exp) ||
      state.exp <= now ||
      !Number.isFinite(state.last) ||
      typeof state.sid !== 'string'
    )
      return null;
    for (const name of ['solved', 'learned', 'viewed']) {
      if (
        !Array.isArray(state[name]) ||
        state[name].length > challengeCount ||
        state[name].some((id) => !Number.isInteger(id) || id < 1 || id > challengeCount)
      )
        return null;
    }
    if (
      !Array.isArray(state.hints) ||
      state.hints.length !== challengeCount ||
      state.hints.some((n) => !Number.isInteger(n) || n < 0 || n > 2)
    )
      return null;
    if (replaceQuestion8) {
      // Version 2 replaces only question 8; retain earlier progress after signature/schema checks.
      state.v = progressVersion;
      for (const name of ['solved', 'learned', 'viewed'])
        state[name] = state[name].filter((id) => id !== 8);
      state.hints[7] = 0;
    }
    return state;
  } catch {
    return null;
  }
}
function newState(catalog) {
  return {
    v: catalog.progressVersion,
    sid: randomUUID(),
    exp: Date.now() + maxAge * 1000,
    last: 0,
    solved: [],
    learned: [],
    viewed: [],
    hints: Array(catalog.questions.length).fill(0),
  };
}
function summary(state) {
  return { solved: state.solved, learned: state.learned, viewed: state.viewed, hints: state.hints };
}
function add(list, id) {
  if (!list.includes(id)) list.push(id);
}
function event(name, state, details = {}) {
  // Aggregate event counts only: no answer text, IP address or session identifier.
  console.log(
    JSON.stringify({
      type: 'ctf_event',
      event: name,
      source: state.source || 'direct',
      ...details,
    }),
  );
}
function cookieFromRequest(req) {
  const raw = req.headers.cookie || '';
  const entry = raw.split(';').find((part) => part.trim().startsWith(`${cookieName}=`));
  return entry ? entry.trim().slice(cookieName.length + 1) : '';
}
async function readBody(req) {
  if (req.body !== undefined) {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (Buffer.byteLength(JSON.stringify(body)) > 4096) throw new Error('body too big');
    return body;
  }
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (Buffer.byteLength(raw) > 4096) throw new Error('body too big');
  }
  return JSON.parse(raw);
}
export function createGameHandler(loadCatalog = getCatalog) {
  return async function handler(req, res) {
    const send = (code, data) => {
      res.statusCode = code;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'private, no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.end(JSON.stringify(data));
    };
    try {
      secret();
      const catalog = await loadCatalog();
      const challenges = catalog.questions;
      const challengeCount = challenges.length;
      let state = decodeState(cookieFromRequest(req), Date.now(), catalog) || newState(catalog);
      const source = new URL(req.url || '/', 'http://localhost').searchParams.get('source');
      if (['school', 'x', 'event'].includes(source)) state.source = source;
      const setCookie = () => {
        const secure = process.env.VERCEL || req.headers['x-forwarded-proto'] === 'https';
        res.setHeader(
          'Set-Cookie',
          `${cookieName}=${encodeState(state)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure ? '; Secure' : ''}`,
        );
      };
      if (req.method === 'GET') {
        setCookie();
        send(200, {
          challenges: publicChallenges(challenges),
          progress: summary(state),
          catalogVersion: catalog.progressVersion,
        });
        return;
      }
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'GET, POST');
        send(405, { error: 'この操作は利用できません。' });
        return;
      }
      if (!req.headers['content-type']?.startsWith('application/json')) {
        send(415, { error: '送信形式が正しくありません。' });
        return;
      }
      const origin = req.headers.origin;
      if (
        origin &&
        new URL(origin).host !== (req.headers['x-forwarded-host'] || req.headers.host)
      ) {
        send(403, { error: 'この送信元からの操作は利用できません。' });
        return;
      }
      if (req.headers['sec-fetch-site'] === 'cross-site') {
        send(403, { error: 'この送信元からの操作は利用できません。' });
        return;
      }
      let body;
      try {
        body = await readBody(req);
      } catch {
        send(400, { error: '送信内容を確認してください。' });
        return;
      }
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        send(400, { error: '送信内容を確認してください。' });
        return;
      }
      if (body.catalogVersion !== catalog.progressVersion) {
        send(409, { error: '問題が更新されました。画面を再読み込みしてからお試しください。' });
        return;
      }
      if (body.action === 'reset') {
        state = newState(catalog);
        setCookie();
        send(200, { progress: summary(state) });
        return;
      }
      if (body.action === 'official') {
        if (!state.officialClicked) {
          event('official_click', state);
          state.officialClicked = true;
        }
        setCookie();
        send(200, { progress: summary(state) });
        return;
      }
      const challenge = challenges.find((c) => c.id === body.id);
      if (!challenge) {
        send(400, { error: '問題が見つかりません。' });
        return;
      }
      const id = challenge.id;
      let result = {};
      if (body.action === 'answer') {
        if (typeof body.answer !== 'string' || body.answer.length > 100 || !body.answer.trim()) {
          send(400, { error: 'フラグを100文字以内で入力してください。' });
          return;
        }
        if (Date.now() - state.last < 750) {
          send(429, { error: '少し待って、もう一度送信してください。' });
          return;
        }
        state.last = Date.now();
        const correct = normalizeAnswer(body.answer) === challenge.answer;
        if (correct && !state.solved.includes(id) && !state.learned.includes(id)) {
          add(state.solved, id);
          event('solve', state, { challenge: id });
        }
        result = {
          correct,
          ...(correct
            ? {
                explanation: challenge.explanation,
                learning: challenge.learning,
                answer: challenge.answer,
                assisted: state.learned.includes(id),
              }
            : {}),
        };
      } else if (body.action === 'hint') {
        if (state.hints[id - 1] < 2)
          event('hint', state, { challenge: id, stage: state.hints[id - 1] + 1 });
        state.hints[id - 1] = Math.min(2, state.hints[id - 1] + 1);
        result = { hints: challenge.hints.slice(0, state.hints[id - 1]) };
      } else if (body.action === 'explanation') {
        if (!state.solved.includes(id) && !state.learned.includes(id)) {
          add(state.learned, id);
          event('learn', state, { challenge: id });
        }
        result = {
          explanation: challenge.explanation,
          learning: challenge.learning,
          answer: challenge.answer,
          assisted: !state.solved.includes(id),
        };
      } else if (body.action === 'view') {
        if (!state.viewed.length) event('start', state);
        if (!state.viewed.includes(id)) event('view', state, { challenge: id });
        add(state.viewed, id);
      } else if (body.action === 'restore') {
        result = {
          hints: challenge.hints.slice(0, state.hints[id - 1]),
          ...(state.solved.includes(id) || state.learned.includes(id)
            ? {
                explanation: challenge.explanation,
                learning: challenge.learning,
                answer: challenge.answer,
                assisted: state.learned.includes(id),
              }
            : {}),
        };
      } else {
        send(400, { error: '操作が見つかりません。' });
        return;
      }
      if (state.solved.length + state.learned.length === challengeCount && !state.completed) {
        event('complete', state);
        state.completed = true;
      }
      setCookie();
      send(200, { ...result, progress: summary(state) });
    } catch (error) {
      console.error('CTF service failure');
      send(503, { error: 'ただいま接続できません。少し待ってから再試行してください。' });
    }
  };
}

export default createGameHandler();
