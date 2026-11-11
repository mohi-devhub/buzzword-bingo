// Writes the approved thirty-company sample from the frozen Phase 1 YC list.
// Uses the original run's slugs so later list changes cannot silently change cohorts.
import { join } from 'node:path';
import { companiesSchema, runSchema } from '../src/data.js';
import { projectRoot, readJson, writeJson } from '../src/files.js';
import { tuningSample } from '../src/sampling.js';

const dataset = await readJson(join(projectRoot, 'data/companies.json'), companiesSchema);
const original = await readJson(join(projectRoot, 'data/runs/de1b62be-84de-4614-992f-b2868e8d7e39.json'), runSchema);
const sample = tuningSample(dataset, original.selectedSlugs);
await writeJson(join(projectRoot, 'data/samples/fall-2026-tuning.json'), sample);
process.stdout.write(`${JSON.stringify(sample, null, 2)}\nContext.dev credits used: 0.\n`);
