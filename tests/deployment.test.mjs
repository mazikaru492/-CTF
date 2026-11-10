import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

test('deployment export excludes question fixtures and preserves images and CMS runtime files', async () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const { stdout } = await promisify(execFile)(process.execPath, ['scripts/deployment-files.mjs'], {
    cwd: root,
    // The official mascot image collection is included as base64 in the export.
    maxBuffer: 64 * 1024 * 1024,
  });
  const files = JSON.parse(stdout);
  for (const path of [
    'server/content-baseline.json',
    'server/catalog.mjs',
    'server/microcms-catalog.mjs',
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
    files.every(
      (file) =>
        !['.env', 'test-results/', 'tests/', 'content/', 'migration/'].some((prefix) =>
          file.file.startsWith(prefix),
        ),
    ),
  );
});
