// Prints three stored homepage texts for the Phase 1 review gate.
// Reads saved records without making API calls or computing buzzword scores.
import { join } from 'node:path';
import { companiesSchema, scrapeSchema } from '../src/data.js';
import { jsonFiles, projectRoot, readJson } from '../src/files.js';

const dataset = await readJson(join(projectRoot, 'data/companies.json'), companiesSchema);
const selected = new Set(dataset.companies.slice(0, 10).map((company) => company.id));
const shown = new Set<number>();
for (const path of (await jsonFiles(join(projectRoot, '.local/scrapes'))).reverse()) {
  const record = await readJson(path, scrapeSchema);
  if (!selected.has(record.companyId) || shown.has(record.companyId) || record.result.status !== 'scraped') continue;
  process.stdout.write(`\n${record.companyName} | ${record.result.wordCount} words | ${path}\n${record.result.text}\n`);
  shown.add(record.companyId);
  if (shown.size === 3) break;
}
if (shown.size < 3) process.stdout.write(`Only ${shown.size} successful stored homepages are available.\n`);
