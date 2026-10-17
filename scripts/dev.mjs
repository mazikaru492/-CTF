import { createServer } from 'node:http';
import { readFile, appendFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { randomBytes } from 'node:crypto';
import handler from '../server/game.mjs';
import { checkContent } from './check.mjs';

await checkContent();
if (!process.env.CTF_SESSION_SECRET) {
  process.env.CTF_SESSION_SECRET = randomBytes(32).toString('hex');
  await appendFile('.env.local', `\nCTF_SESSION_SECRET=${process.env.CTF_SESSION_SECRET}\n`, {
    mode: 0o600,
  });
  console.log('Local session key saved in .env.local (not committed).');
}
const publicRoot = resolve('public');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.json': 'application/json',
};
const config = JSON.parse(await readFile(resolve('vercel.json'), 'utf8'));
createServer(async (req, res) => {
  for (const { key, value } of config.headers[0].headers) res.setHeader(key, value);
  let path;
  let decoded;
  try {
    path = new URL(req.url, 'http://localhost').pathname;
    decoded = decodeURIComponent(path === '/' ? '/index.html' : path);
    if (/[\u0000-\u001f\u007f]/.test(decoded)) throw new Error('Invalid path');
  } catch {
    res.writeHead(400);
    res.end('Bad request');
    return;
  }
  if (path === '/api/game') return handler(req, res);
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    res.end('Method not allowed');
    return;
  }
  const target = resolve(publicRoot, '.' + decoded);
  if (!target.startsWith(publicRoot + '\\') && !target.startsWith(publicRoot + '/')) {
    res.writeHead(403);
    res.end();
    return;
  }
  try {
    const file = await readFile(target);
    res.writeHead(200, {
      'Content-Type': mime[extname(target)] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(file);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}).listen(Number(process.env.PORT || 3000), '127.0.0.1', () =>
  console.log('CTF preview: http://127.0.0.1:3000'),
);
