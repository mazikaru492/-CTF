import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkContent } from './check.mjs';

await checkContent();
const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'dist');
if (dirname(output) !== resolve(root))
  throw new Error('Build output must stay inside the project.');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(resolve(root, 'public'), output, { recursive: true });
console.log(
  `Static assets ready: ${(await readdir(output)).length} entries. Questions and answers stay server-side.`,
);
