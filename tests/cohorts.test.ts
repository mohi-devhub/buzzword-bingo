// Checks configurable cohort loading, stable identities, and global opt-outs.
// Keeps comparison data separate from the YC list without bypassing exclusions.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { selectCohort } from '../src/cohorts.js';
import { cohortSchema, metadata } from '../src/data.js';
import { writeJson } from '../src/files.js';

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'buzzword-cohort-'));
  const meta = metadata('Contains a synthetic comparison cohort.', 'Verifies selection without network calls or credentials.');
  const cohort = cohortSchema.parse({ _meta: meta, id: 'external', label: 'External comparison',
    source: 'https://example.com/list', sourceFetchedAt: '2026-11-11T10:00:00Z', strategy: 'Fixed test members',
    companies: [1, 2].map((number) => ({ id: 1_000_000_000 + number, slug: `external-${number}`,
      name: `External ${number}`, website: `https://example.com/${number}`, batch: 'External comparison',
      status: 'Active', oneLiner: '', logoUrl: null })),
  });
  await writeJson(join(root, 'data/cohorts/external.json'), cohort);
  await writeJson(join(root, 'data/exclusions.json'), { _meta: meta, companyIds: [], normalizedUrls: [] });
  return { root, cohort, meta, cleanup: () => rm(root, { recursive: true, force: true }) };
}

test('an external cohort loads without replacing or requiring the YC company list', async () => {
  const setup = await fixture();
  try {
    const result = await selectCohort(setup.root, { cohort: 'external' });
    assert.equal(result.label, 'External comparison');
    assert.deepEqual(result.companies.map((company) => company.slug), ['external-1', 'external-2']);
    await assert.rejects(selectCohort(setup.root, { cohort: 'external', sample: 'yc' }), /either/);
    await assert.rejects(selectCohort(setup.root, { cohort: '../external' }));
  } finally { await setup.cleanup(); }
});

test('external cohort companies obey both ID and normalized-URL opt-outs', async () => {
  const setup = await fixture();
  try {
    await writeJson(join(setup.root, 'data/exclusions.json'), { _meta: setup.meta,
      companyIds: [1_000_000_001], normalizedUrls: ['https://EXAMPLE.com:443/2#ignored'] });
    const result = await selectCohort(setup.root, { cohort: 'external' });
    assert.equal(result.companies.length, 0);
  } finally { await setup.cleanup(); }
});

test('duplicate identities and mismatched cohort filenames are rejected before collection', async () => {
  const setup = await fixture();
  try {
    await writeJson(join(setup.root, 'data/cohorts/external.json'), { ...setup.cohort,
      companies: [...setup.cohort.companies, ...setup.cohort.companies] });
    await assert.rejects(selectCohort(setup.root, { cohort: 'external' }), /duplicate/);
    await writeJson(join(setup.root, 'data/cohorts/external.json'), { ...setup.cohort, id: 'different' });
    await assert.rejects(selectCohort(setup.root, { cohort: 'external' }), /filename/);
  } finally { await setup.cleanup(); }
});
