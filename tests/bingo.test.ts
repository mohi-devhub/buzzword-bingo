// Checks every bingo direction, near misses, and the free centre.
// Keeps badges rare according to the fixed card rather than the density score.
import test from 'node:test';
import assert from 'node:assert/strict';
import { bingoCard, bingoLines, evaluateBingo } from '../src/bingo.js';
import { buzzwords } from '../src/buzzwords.js';

test('card has 24 unique dictionary phrases, a free centre, and no removed normal-language cells', () => {
  assert.equal(bingoCard.length, 25);
  assert.equal(new Set(bingoCard).size, 25);
  assert.equal(bingoCard[12], null);
  const phrases = new Set(buzzwords.map((word) => word.id));
  for (const id of bingoCard) if (id !== null) assert.ok(phrases.has(id));
  for (const id of ['ai-agent', 'agentic', 'copilot', 'scalable', 'robust', 'ecosystem', 'end-to-end', 'multi-agent']) {
    assert.equal(bingoCard.includes(id), false);
  }
});

test('each of five rows, five columns, and two diagonals completes independently', () => {
  assert.equal(bingoLines.length, 12);
  for (const line of bingoLines) {
    const phrases = line.cells.flatMap((index) => {
      const id = bingoCard[index];
      return id ? [id] : [];
    });
    const result = evaluateBingo(phrases);
    assert.equal(result.hasBingo, true, line.id);
    assert.deepEqual(result.completedLines, [line.id], line.id);
    const nearMiss = evaluateBingo(phrases.slice(1));
    assert.equal(nearMiss.hasBingo, false, line.id);
  }
});

test('empty cards only mark FREE, and a full card returns all completed lines', () => {
  const empty = evaluateBingo([]);
  assert.deepEqual(empty.cells.filter((cell) => cell.hit).map((cell) => cell.index), [12]);
  assert.equal(empty.hasBingo, false);
  const full = evaluateBingo(bingoCard.flatMap((id) => id ? [id] : []));
  assert.equal(full.completedLines.length, 12);
  assert.equal(evaluateBingo(['agentic', 'robust', 'ai-agent']).hasBingo, false);
});
