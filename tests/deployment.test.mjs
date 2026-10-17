import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

test('deployment file export includes the catalog and preserves binary images without secrets', async () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const { stdout } = await promisify(execFile)(process.execPath, ['scripts/deployment-files.mjs'], {
    cwd: root,
    maxBuffer: 32 * 1024 * 1024,
  });
  const files = JSON.parse(stdout);
  for (const path of [
    'content/questions.json',
    'server/validate-content.mjs',
    'scripts/check.mjs',
    'public/assets/desk-photo.png',
    'public/assets/rai-rii-cutout.png',
  ]) {
    const file = files.find((file) => file.file === path);
    assert.ok(file, `Missing ${path}`);
    assert.equal(file.encoding, 'base64');
    assert.deepEqual(
      Buffer.from(file.data, file.encoding),
      await readFile(new URL('../' + path, import.meta.url)),
    );
  }
  assert.ok(
    files.every((file) => !file.file.startsWith('.env') && !file.file.startsWith('test-results/')),
  );
});
