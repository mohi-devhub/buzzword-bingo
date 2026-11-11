// Tests observable matching, density, Unicode offsets, and safe evidence rendering.
// Prevents normal substrings, failed pages, or markup from producing misleading scores.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buzzwords } from '../src/buzzwords.js';
import { matchBuzzwords, scoreText, scoringVersion } from '../src/score.js';
import { excerpt, highlightedHtml } from '../src/highlight.js';
import { wordCount } from '../src/extract.js';

const count = (text: string, id: string) => matchBuzzwords(text).matches.filter((match) => match.phraseId === id).length;

test('the approved dictionary, weights, card, and scoring rules remain frozen for comparison and site work', () => {
  assert.equal(scoringVersion, 'v1-ac78c5b97c1f', 'Changing the approved rules requires explicit user approval.');
});

test('case, spaces, Unicode hyphens, dotted AI, plurals, and explicit suffixes match', () => {
  assert.equal(count('AI-powered ai powered AI‑POWERED A.I.-powered', 'ai-powered'), 4);
  assert.equal(count('copilots co-pilots CO PILOT', 'copilot'), 3);
  assert.equal(count('AI agents AI-agent', 'ai-agent'), 2);
  assert.equal(count('multiagent multi-agent multi agent', 'multi-agent'), 3);
  assert.equal(count('seamless seamlessly', 'seamless'), 2);
  assert.equal(count('unlock unlocking unlocked unlocks', 'unlock'), 4);
  assert.equal(count('revolutionising revolutionized revolutionises', 'revolutionize'), 3);
  assert.equal(count('GAME CHANGERS game-changing', 'game-changing'), 2);
  assert.equal(count('scalability robustly ecosystems', 'scalable'), 1);
  assert.equal(count('scalability robustly ecosystems', 'robust'), 1);
  assert.equal(count('scalability robustly ecosystems', 'ecosystem'), 1);
});

test('every canonical dictionary phrase matches as one phrase', () => {
  for (const word of buzzwords) assert.equal(count(word.phrase, word.id), 1, word.phrase);
  assert.equal(buzzwords.length, 50);
  const requested = ['ai-agent', 'agentic', 'copilot', 'scalable', 'robust', 'ecosystem', 'end-to-end', 'multi-agent'];
  for (const id of requested) assert.equal(buzzwords.find((word) => word.id === id)?.weight, 1, id);
});

test('no false matches inside ASCII or Unicode words, or longer numbers', () => {
  assert.equal(matchBuzzwords('unseamly semiseamless seamlessness unrobust robustification unscalable prérobust robusté 110x 210× AI-poweredness').matches.length, 0);
  assert.equal(count('10x 10X 10× 10 x 10-x', '10x'), 5);
  assert.equal(count('agent agentic agents', 'agentic'), 1);
});

test('longest overlapping phrase wins, while standalone repetitions remain', () => {
  const result = matchBuzzwords('Agentic workflows are agentic. Agentic workflow.');
  assert.deepEqual(result.matches.map((match) => match.phraseId), ['agentic-workflow', 'agentic', 'agentic-workflow']);
  assert.equal(result.matches.length, 3);
});

test('density is exact weighted hits per 100 words, with category totals and raw counts', () => {
  const text = ['AI-powered', 'AI powered', 'world-class', ...Array(96).fill('ordinary')].join(' ');
  assert.equal(wordCount(text), 100);
  const score = scoreText(text);
  assert.equal(score.status, 'scored');
  if (score.status !== 'scored') throw new Error('The fixture must be scored.');
  assert.equal(score.wordCount, 100);
  assert.equal(score.rawHits, 3);
  assert.equal(score.weightedHits, 7);
  assert.equal(score.density, 7);
  assert.equal(score.phraseCounts.find((word) => word.id === 'ai-powered')?.count, 2);
  assert.equal(score.categoryScores.find((category) => category.category === 'AI hype')?.density, 4);
  assert.equal(score.categoryScores.find((category) => category.category === 'Big claims')?.density, 3);
  const doubled = scoreText(`${text} ${text}`);
  assert.equal(doubled.status === 'scored' && doubled.density, 7);
});

test('valid zero-hit pages score zero; empty and short pages have no density or bingo', () => {
  const score = scoreText(Array(50).fill('ordinary').join(' '));
  assert.equal(score.status === 'scored' && score.density, 0);
  assert.equal(score.status === 'scored' && score.bingo.hasBingo, false);
  for (const text of ['', 'agentic']) {
    const invalid = scoreText(text);
    assert.equal(invalid.status, 'unscored');
    assert.equal('density' in invalid, false);
    assert.equal('bingo' in invalid, false);
  }
});

test('NFKC normalization preserves exact offsets into the returned display text', () => {
  const result = matchBuzzwords('oﬃce ＡＩ－ＰＯＷＥＲＥＤ 🚀 seamless');
  assert.equal(result.normalizedText, 'office AI-POWERED 🚀 seamless');
  assert.deepEqual(result.matches.map((match) => match.phraseId), ['ai-powered', 'seamless']);
  for (const match of result.matches) assert.equal(result.normalizedText.slice(match.start, match.end), match.text);
  assert.deepEqual(matchBuzzwords(result.normalizedText), result);
});

test('highlighting escapes source HTML and excerpts refer to the original saved span', () => {
  const result = matchBuzzwords('We build <script>alert("hi")</script> seamless tools & ordinary workflows.');
  const html = highlightedHtml(result.normalizedText, result.matches);
  assert.ok(html.includes('&lt;script&gt;alert(&quot;hi&quot;)&lt;/script&gt;'));
  assert.ok(html.includes('<mark>seamless</mark>'));
  assert.ok(html.includes('&amp;'));
  assert.equal(html.includes('<script>'), false);
  const first = result.matches[0];
  assert.ok(first);
  const snippet = excerpt(result.normalizedText, result.matches, first);
  assert.equal(snippet.text, result.normalizedText.slice(snippet.start, snippet.end));
  assert.ok(snippet.html.includes('<mark>seamless</mark>'));
  assert.ok(snippet.text.split(/\s+/).length <= 12);
});
