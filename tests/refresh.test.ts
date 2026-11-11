// Checks the scheduled planner against real budget arithmetic and monthly cache rules.
// Prevents future automation from spending on partial batches or routine weekly re-crawls.
import test from 'node:test';
import assert from 'node:assert/strict';
import { planCollection } from '../src/refresh.js';
import { companySchema, metadata, policySchema, scrapeSchema } from '../src/data.js';

const date = new Date('2026-11-16T04:17:00Z');
const meta = metadata('Defines synthetic scheduling fixtures.', 'Verifies budget and cadence without network requests.');
const company = companySchema.parse({ id: 1, slug: 'example', name: 'Example', website: 'https://example.com/',
  batch: 'Fall 2026', status: 'Active', oneLiner: '', logoUrl: null });
const policy = policySchema.parse({ _meta: meta, maxCompaniesPerRun: 300, maxNewRequestsPerRun: 250,
  authorizedRequests: 300, authorizedCredits: 300, monthlyCredits: 1000, externalMonthlyCredits: 0 });
const pending = scrapeSchema.parse({ _meta: meta, companyId: 1, slug: company.slug, companyName: company.name,
  batch: company.batch, requestedUrl: company.website, normalizedUrl: company.website, week: '2026-W46',
  attemptId: '00000000-0000-4000-8000-000000000001', runId: '00000000-0000-4000-8000-000000000002',
  attemptedAt: '2026-11-11T10:00:00Z', finishedAt: null, sdkVersion: '3.28.0', extractionVersion: 'main-markdown-v1',
  requestId: null, credits: { source: 'estimated', consumed: 1, remaining: null },
  result: { status: 'pending', reason: 'interrupted_or_in_flight' } });
const base = { companies: [company], records: [], runs: [], policy, date, refresh: false };

test('ordinary weeks reuse even interrupted attempts from earlier weeks', () => {
  assert.equal(planCollection({ ...base, records: [pending] }).reason, 'cached');
  assert.equal(planCollection({ ...base, records: [pending] }).newRequests, 0);
});
test('only the first Monday may plan a monthly re-crawl', () => {
  assert.equal(planCollection({ ...base, records: [pending], refresh: true }).reason, 'not_first_monday');
  assert.equal(planCollection({ ...base, records: [pending], refresh: true,
    date: new Date('2026-12-07T04:17:00Z') }).newRequests, 1);
  assert.equal(planCollection({ ...base, records: [pending], refresh: true,
    date: new Date('2026-12-07T04:17:00Z') }).allowed, true);
});
test('a whole cohort must fit every allowance; partial affordability does not authorize it', () => {
  const companies = [company, { ...company, id: 2, slug: 'second', website: 'https://second.example/' }];
  for (const change of [{ authorizedCredits: 1 }, { authorizedRequests: 1 }, { monthlyCredits: 1 },
    { monthlyCredits: 1000, externalMonthlyCredits: 999 }, { maxNewRequestsPerRun: 1 }]) {
    assert.equal(planCollection({ ...base, companies, policy: { ...policy, ...change } }).allowed, false);
  }
  assert.equal(planCollection({ ...base, companies, policy: { ...policy, authorizedCredits: 2 } }).allowed, true);
});
test('shared URLs cost one new request and company-count limits still apply', () => {
  const companies = [company, { ...company, id: 2, slug: 'second' }];
  assert.equal(planCollection({ ...base, companies }).newRequests, 1);
  assert.equal(planCollection({ ...base, companies, policy: { ...policy, maxCompaniesPerRun: 1 } }).reason, 'company_limit');
});
