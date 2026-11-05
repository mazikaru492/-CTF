import { loadEnvFile } from 'node:process';
import { getCatalog } from '../server/catalog.mjs';

try {
  loadEnvFile(new URL('../.env.local', import.meta.url));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

const catalog = await getCatalog();
export const challenges = catalog.questions;
export const challengeCount = challenges.length;
