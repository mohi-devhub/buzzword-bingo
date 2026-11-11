// Fetches the newest qualifying YC batch or an explicitly requested batch.
// Saves validated metadata and comparison counts without spending scrape credits.
import { parseArgs } from 'node:util';
import { importCompanies } from '../src/companies.js';
import { projectRoot } from '../src/files.js';

try {
  const { values } = parseArgs({ options: { batch: { type: 'string' } } });
  const dataset = await importCompanies(projectRoot, values.batch);
  process.stdout.write(`${JSON.stringify({ selectedBatch: dataset.selectedBatch,
    eligible: dataset.companies.length, batchCounts: dataset.batchCounts, creditsUsed: 0 }, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : 'Company import failed.'}\n`);
  process.exitCode = 1;
}
