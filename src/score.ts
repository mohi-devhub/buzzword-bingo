// Counts approved phrase variants and calculates weighted hits per 100 words.
// Produces deterministic counts, categories, offsets, and bingo without an LLM.
import { createHash } from 'node:crypto';
import { buzzwords, categories } from './buzzwords.js';
import { bingoCard, evaluateBingo } from './bingo.js';
import { wordCount } from './extract.js';

export const formula = '100 * weightedHits / wordCount';
export const scoringVersion = `v1-${createHash('sha256').update(JSON.stringify({
  buzzwords, bingoCard, rules: 'NFKC; Unicode boundaries; whitespace-or-dash separators; longest-span-first; dictionary-order ties; word-count-v1; min-50-words',
})).digest('hex').slice(0, 12)}`;

export type Match = { phraseId: string; dictionaryIndex: number; start: number; end: number; text: string };

function escaped(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function pattern(variant: string): string {
  return variant.normalize('NFKC').split(/[\s\p{Pd}]+/u).map(escaped).join('[\\s\\p{Pd}]+');
}

const matchers = buzzwords.map((word) => new RegExp(
  `(?<![\\p{L}\\p{N}])(?:${[...new Set(word.variants.map(pattern))].sort((a, b) => b.length - a.length).join('|')})(?![\\p{L}\\p{N}])`, 'giu',
));

export function matchBuzzwords(input: string): { normalizedText: string; matches: Match[] } {
  const normalizedText = input.normalize('NFKC');
  const candidates: Match[] = [];
  buzzwords.forEach((word, dictionaryIndex) => {
    const matcher = matchers[dictionaryIndex];
    if (!matcher) return;
    for (const match of normalizedText.matchAll(matcher)) {
      candidates.push({ phraseId: word.id, dictionaryIndex, start: match.index,
        end: match.index + match[0].length, text: match[0] });
    }
  });
  candidates.sort((a, b) => (b.end - b.start) - (a.end - a.start) || a.dictionaryIndex - b.dictionaryIndex || a.start - b.start);
  const matches: Match[] = [];
  for (const match of candidates) {
    if (!matches.some((accepted) => match.start < accepted.end && match.end > accepted.start)) matches.push(match);
  }
  matches.sort((a, b) => a.start - b.start);
  return { normalizedText, matches };
}

export function scoreText(input: string) {
  const { normalizedText, matches } = matchBuzzwords(input);
  const words = wordCount(normalizedText);
  if (words < 50) return { status: 'unscored', reason: words === 0 ? 'empty_page' : 'insufficient_text', wordCount: words } satisfies {
    status: 'unscored'; reason: string; wordCount: number;
  };
  const phraseCounts = buzzwords.map((word) => {
    const count = matches.filter((match) => match.phraseId === word.id).length;
    return { id: word.id, phrase: word.phrase, category: word.category, weight: word.weight, count, weightedHits: count * word.weight };
  });
  const weightedHits = phraseCounts.reduce((sum, phrase) => sum + phrase.weightedHits, 0);
  const categoryScores = categories.map((category) => {
    const counts = phraseCounts.filter((phrase) => phrase.category === category);
    const categoryWeightedHits = counts.reduce((sum, phrase) => sum + phrase.weightedHits, 0);
    return { category, rawHits: counts.reduce((sum, phrase) => sum + phrase.count, 0),
      weightedHits: categoryWeightedHits, density: 100 * categoryWeightedHits / words };
  });
  const status: 'scored' = 'scored';
  return { status, normalizedText, wordCount: words, rawHits: matches.length, weightedHits,
    density: 100 * weightedHits / words, phraseCounts, categoryScores, matches,
    bingo: evaluateBingo(phraseCounts.filter((phrase) => phrase.count > 0).map((phrase) => phrase.id)) };
}

export type Score = ReturnType<typeof scoreText>;
