// Compares the frozen YC and established cohorts using the same stored scoring rules.
// Writes descriptive statistics, cohort cards, and per-company line progress for review.
import { parseArgs } from 'node:util';
import { join } from 'node:path';
import { z } from 'zod';
import { isoWeek } from '../src/cache.js';
import { metadata, slugSchema } from '../src/data.js';
import { projectRoot, readJson, writeJson } from '../src/files.js';
import { scoreFileSchema } from '../src/results.js';
import { summarizeCohort, comparisonFileSchema } from '../src/comparison.js';

const { values } = parseArgs({ options: { week: { type: 'string', default: isoWeek(new Date()) },
  cohort: { type: 'string', default: 'bvp-established' } } });
const week = z.string().regex(/^\d{4}-W\d{2}$/).parse(values.week);
const name = slugSchema.parse(values.cohort);
const paths = [`data/scores/${week}.json`, `data/scores/${week}/${name}.json`];
const cohorts = [];
let signature: string | undefined;
for (const path of paths) {
  const score = await readJson(join(projectRoot, path), scoreFileSchema);
  const rules = JSON.stringify({ version: score.scoringVersion, formula: score.formula, dictionary: score.dictionary, card: score.card });
  if (signature !== undefined && signature !== rules) throw new Error('Cohorts use different scoring rules; comparison refused.');
  if (score.week !== week) throw new Error('Cohort score weeks differ; comparison refused.');
  signature = rules;
  cohorts.push({ id: score.sample, label: score.batch, scoreFile: path, scoringVersion: score.scoringVersion,
    ...summarizeCohort(score.companies), companyProgress: score.companies.map((company) => company.status === 'scored'
      ? { slug: company.slug, name: company.name, status: company.status, density: company.density,
        bestLine: company.bingo.bestLine, sourceTextHash: company.source?.textHash ?? null }
      : { slug: company.slug, name: company.name, status: company.status, reason: company.reason }) });
}
const comparison = { _meta: metadata('Compares the full pinned YC batch with the fixed public-cloud-company cohort.',
  'Reports medians, zero-hit rates, phrase coverage, and bingo progress without changing scores.'),
  week, formula: 'Median of company weighted-hit densities; zero-hit percentage among valid scored pages.',
  bingoPresentationVersion: 'cohort-progress-v1', cohorts };
await writeJson(join(projectRoot, `data/comparisons/${week}.json`), comparisonFileSchema.parse(comparison));
process.stdout.write(`${JSON.stringify(cohorts.map(({ id, selected, scored, unscored, medianDensity, zeroHits, zeroHitPercent, bingo }) => ({
  id, selected, scored, unscored, medianDensity, zeroHits, zeroHitPercent, cohortBestLine: `${bingo.bestLine.hits}/5`, completedLines: bingo.completedLines,
})), null, 2)}\nCredits used: 0.\n`);
