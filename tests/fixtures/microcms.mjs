export function toMicrocmsQuestion(question) {
  const block = { fieldId: question.kind, ...structuredClone(question.material) };
  for (const name of ['image', 'before', 'after']) {
    if (!block[name]) continue;
    if (block[name].startsWith('/assets/')) {
      block[`${name}Path`] = block[name];
      delete block[name];
    }
  }
  if (question.kind === 'ascii') block.numbers = block.numbers.join(' ');
  if (question.kind === 'records') block.current = block.current.join(' ');
  for (const [name, type] of [
    ['logs', 'logRow'],
    ['devices', 'codeRow'],
    ['backup', 'codeRow'],
    ['cards', 'timeRow'],
    ['emails', 'emailRow'],
  ]) {
    if (!Array.isArray(block[name])) continue;
    block[name] = block[name].map(({ id, ...row }) => ({
      fieldId: type,
      ...(id ? { itemId: id } : {}),
      ...row,
    }));
  }
  return {
    id: `question-${String(question.id).padStart(2, '0')}`,
    questionNumber: question.id,
    ...Object.fromEntries(
      ['title', 'category', 'subtitle', 'instruction', 'answer', 'explanation', 'learning'].map(
        (k) => [k, question[k]],
      ),
    ),
    hint1: question.hints[0],
    hint2: question.hints[1],
    material: [block],
  };
}
