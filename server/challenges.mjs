export function publicChallenges(list) {
  return list.map(({ answer, hints, explanation, learning, ...publicData }) => ({
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
