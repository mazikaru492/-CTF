import { readdir, readFile } from 'node:fs/promises';
const files = [];
async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) await collect(path);
    else files.push({ file: path, data: await readFile(path, 'utf8') });
  }
}
for (const directory of ['public', 'api', 'server']) await collect(directory);
for (const file of ['package.json', 'package-lock.json', 'vercel.json', 'scripts/build.mjs']) files.push({ file, data: await readFile(file, 'utf8') });
process.stdout.write(JSON.stringify(files));
