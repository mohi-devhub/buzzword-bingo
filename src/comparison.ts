// Calculates descriptive cohort statistics and aggregate bingo coverage.
// Keeps failed pages out of medians and zero-hit percentages while reporting them.
import { cohortBingo } from './bingo.js';
import { buzzwords } from './buzzwords.js';
import { rankCompanies, bestLineSchema, bingoResultSchema, type CompanyResult } from './results.js';
import { metaSchema, slugSchema } from './data.js';
import { z } from 'zod';

const countSchema = z.number().int().nonnegative();
const progressBaseSchema = z.object({ slug: slugSchema, name: z.string() });
export const comparisonFileSchema = z.object({
  _meta: metaSchema, week: z.string(), formula: z.string(), bingoPresentationVersion: z.literal('cohort-progress-v1'),
  cohorts: z.array(z.object({
    id: slugSchema, label: z.string(), scoreFile: z.string(), scoringVersion: z.string(), selected: countSchema,
    scored: countSchema, unscored: countSchema, medianDensity: z.number().nonnegative().nullable(),
    zeroHits: countSchema, zeroHitPercent: z.number().min(0).max(100).nullable(),
    phrases: z.array(z.object({ id: z.string(), phrase: z.string(), weight: z.number(), dictionaryIndex: countSchema, hits: countSchema, companiesHit: countSchema })),
    bingo: bingoResultSchema.extend({ scoredCompanies: countSchema,
      cells: z.array(bingoResultSchema.shape.cells.element.extend({ companiesHit: countSchema.nullable() })).length(25) }),
    companyProgress: z.array(z.discriminatedUnion('status', [
      progressBaseSchema.extend({ status: z.literal('scored'), density: z.number().nonnegative(), bestLine: bestLineSchema, sourceTextHash: z.string().nullable() }),
      progressBaseSchema.extend({ status: z.literal('unscored'), reason: z.string() }),
    ])),
  })),
});
export type Comparison = z.infer<typeof comparisonFileSchema>;

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const upper = sorted[middle];
  const lower = sorted[middle - 1];
  if (upper === undefined) return null;
  return sorted.length % 2 === 0 && lower !== undefined ? (lower + upper) / 2 : upper;
}

export function summarizeCohort(companies: CompanyResult[]) {
  const scored = rankCompanies(companies);
  const zeroHits = scored.filter((company) => company.rawHits === 0).length;
  const phrases = buzzwords.map((word, dictionaryIndex) => {
    const counts = scored.map((company) => company.phraseCounts.find((phrase) => phrase.id === word.id)?.count ?? 0);
    return { id: word.id, phrase: word.phrase, weight: word.weight, dictionaryIndex,
      hits: counts.reduce((sum, count) => sum + count, 0), companiesHit: counts.filter((count) => count > 0).length };
  }).sort((a, b) => b.hits - a.hits || b.companiesHit - a.companiesHit || a.dictionaryIndex - b.dictionaryIndex);
  return { selected: companies.length, scored: scored.length, unscored: companies.length - scored.length,
    medianDensity: median(scored.map((company) => company.density)), zeroHits,
    zeroHitPercent: scored.length ? 100 * zeroHits / scored.length : null,
    phrases, bingo: cohortBingo(scored) };
}
