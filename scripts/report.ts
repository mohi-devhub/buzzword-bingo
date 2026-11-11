// Builds the Phase 1 review report from stored companies, captures, and receipts.
// Lets reviewers reproduce the sample counts without another paid request.
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { companiesSchema, runSchema } from '../src/data.js';
import { readScrapes } from '../src/cache.js';
import { jsonFiles, projectRoot, readJson } from '../src/files.js';

const dataset = await readJson(join(projectRoot, 'data/companies.json'), companiesSchema);
const selected = dataset.companies.slice(0, 10);
const ids = new Set(selected.map((company) => company.id));
const captures = (await readScrapes(projectRoot)).filter((record) => ids.has(record.companyId))
  .sort((a, b) => b.attemptedAt.localeCompare(a.attemptedAt));
const records = selected.flatMap((company) => {
  const record = captures.find((capture) => capture.companyId === company.id);
  return record ? [record] : [];
});
const runs = [];
for (const path of await jsonFiles(join(projectRoot, 'data/runs'))) {
  const run = await readJson(path, runSchema);
  if (run.selectedSlugs.length === 10 && run.selectedSlugs.every((slug) => selected.some((company) => company.slug === slug))) runs.push(run);
}
runs.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
const requests = runs.flatMap((run) => run.requests);
const total = requests.reduce((sum, request) => sum + request.credits.consumed, 0);
const successes = records.filter((record) => record.result.status === 'scraped').length;
const report = [
  '<!-- Reports the completed Phase 1 sample using saved public data and usage receipts.',
  "Keeps the review gate verifiable without spending another scrape credit. -->",
  '', '# Phase 1 review', '',
  `Starting batch: **${dataset.selectedBatch}**. List fetched at \`${dataset.fetchedAt}\`.`,
  `Upstream metadata last updated at \`${dataset.sourceUpdatedAt}\`.`, '',
  '## Batch selection', '',
  '| Batch | Listed | Active | Active with website | Eligible after validation |',
  '| --- | ---: | ---: | ---: | ---: |',
  ...dataset.batchCounts.map((batch) => `| [${batch.batch}](${batch.endpoint}) | ${batch.total} | ${batch.active} | ${batch.activeWithWebsite} | ${batch.eligible} |`),
  '', `${dataset.selectedBatch} is the newest available batch with at least 100 eligible companies. The saved list contains ${dataset.companies.length} companies. The sample is the first ten by stable slug and YC ID, with no replacements or selection by homepage wording.`,
  '', '## Captured homepages', '',
  `${records.length} attempted, ${successes} successful, ${records.length - successes} unscored. No buzzword scores have been computed.`, '',
  '| Company | Word count | Capture |', '| --- | ---: | --- |',
  ...records.map((record) => `| ${record.companyName} | ${record.result.status === 'pending' ? 0 : record.result.wordCount} | [${record.result.status}](.local/scrapes/${record.week}/${record.slug}.json) |`),
  '', 'Each JSON capture includes the requested and final URL, timestamps, title, description, rendered markdown, extracted visible text, word count, extraction version, and usage receipt. The `result.text` field is the exact text reserved for later scoring. Navigation and footer selectors were excluded through the provider, with main-content filtering enabled. Repeated carousel content and page UI that survive the provider filters are retained for review.',
  '', '## Three stored texts to review', '',
  ...['alkera-ai', 'ailit', 'aikido-technologies'].flatMap((slug) => {
    const record = records.find((capture) => capture.slug === slug);
    if (!record || record.result.status !== 'scraped') return [];
    return [`- [${record.companyName}, ${record.result.wordCount} words](.local/scrapes/${record.week}/${record.slug}.json). Inspect \`result.text\` for the complete stored text.`, ''];
  }),
  'Print these three full stored texts locally with `npm run sample`. That command reads only JSON files.',
  '', '## Credit accounting', '',
  '| Run | Requests | Cache hits | Credits used | Basis |', '| --- | ---: | ---: | ---: | --- |',
  ...runs.map((run, index) => `| [${index + 1}](data/runs/${run.id}.json) | ${run.requests.length} | ${run.cacheHits.length} | ${run.requests.reduce((sum, request) => sum + request.credits.consumed, 0)} | ${run.requests.length === 0 ? 'No requests' : run.requests.every((request) => request.credits.source === 'reported') ? 'Provider-reported' : 'Includes estimates'} |`),
  '', `**Total credits used: ${total}.** ${requests.filter((request) => request.credits.source === 'reported').length} requests have provider-reported receipts. Company-list requests and report generation cost no Context.dev credits.`,
  '', 'The first and repeated crawl both used `npm run crawl -- --limit 10`. The second run made no SDK calls, and the canonical cache contents remained identical. Ten credits are authorized in `data/policy.json`; a different batch or week cannot silently increase that allowance.',
  '', '## Cadence and next gate', '',
  'Ordinary crawls reuse prior attempts across weeks. `--refresh` is rejected unless the date is the first Monday of a month in UTC. Current-week and current-month attempts are still reused. A failed or interrupted request is cached too. Automated batch progression, cron, and deployment remain Phase 4 work.',
  '', 'The plan now uses the requested weight-1 terms and a rarer fixed bingo card. Phase 2 will report the BINGO count and percentage against the below-about-20% target. No scoring, site, AI feature, full-batch crawl, cron, or deployment has started.',
  '', '## Verification', '',
  '- `npm run check` checks strict TypeScript types.',
  '- `npm test` covers file-backed cache reuse, duplicate URLs, failed and interrupted attempts, date restrictions, spending caps, opt-outs, the crawl lock, and visible-text extraction.',
  '- `npm run report` regenerates this report from saved data.',
  '- `.env` is ignored by Git. `.env.example` contains no key. The SDK reads its key explicitly from `.env`, with retries and debug logging disabled.',
  '', 'Phase 1 is ready for review. Stop here until Phase 2 is approved.', '',
].join('\n');
await writeFile(join(projectRoot, 'PHASE1.md'), report);
process.stdout.write('Wrote PHASE1.md from saved data. Context.dev credits used: 0.\n');
