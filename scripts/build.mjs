import { cp, mkdir, readdir } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
await cp('public', 'dist', { recursive: true });
console.log(`Static assets ready: ${(await readdir('dist')).length} entries. API stays server-side.`);
