import { readdir, readFile } from 'node:fs/promises';
const files = [];
// Vercel's inline-file format preserves image bytes with base64 encoding.
// https://vercel.com/docs/rest-api/deployments/create-a-new-deployment
async function addFile(file) {
  files.push({ file, data: (await readFile(file)).toString('base64'), encoding: 'base64' });
}
async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) await collect(path);
    else await addFile(path);
  }
}
for (const directory of ['public', 'api', 'server']) await collect(directory);
for (const file of [
  'package.json',
  'package-lock.json',
  'vercel.json',
  'scripts/build.mjs',
  'scripts/check.mjs',
])
  await addFile(file);
process.stdout.write(JSON.stringify(files));
