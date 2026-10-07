import catalog from '../content/questions.json' with { type: 'json' };
import { validateCatalog } from './validate-content.mjs';

validateCatalog(catalog);
export const challenges = catalog.questions;
export const challengeCount = challenges.length;
export const progressVersion = catalog.progressVersion;

export function publicChallenges() {
  return challenges.map(({ answer, hints, explanation, learning, ...publicData }) => ({
    ...publicData,
    hintCount: hints.length,
  }));
}
export function normalizeAnswer(value) {
  return value
    .normalize('NFKC')
    .trim()
    .replace(/^flag\{([^{}]+)\}$/i, '$1')
    .toUpperCase();
}
