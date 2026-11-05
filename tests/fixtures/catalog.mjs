import catalog from './questions.json' with { type: 'json' };

export default catalog;
export const challenges = catalog.questions;
export const challengeCount = challenges.length;
export const progressVersion = catalog.progressVersion;
export { normalizeAnswer, publicChallenges } from '../../server/challenges.mjs';
