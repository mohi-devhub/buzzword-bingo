// Freezes a systematic public-cloud cohort and its official-homepage metadata.
// Creates a configurable comparison list before spending Context.dev credits.
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { join } from 'node:path';
import { z } from 'zod';
import { cohortSchema, homepageSchema, metadata, metaSchema, slugSchema } from '../src/data.js';
import { resolveHomepage, resolvedWebsiteSchema } from '../src/established.js';
import { isMissing, projectRoot, readJson, writeJson } from '../src/files.js';

const { values } = parseArgs({ options: { count: { type: 'string', default: '50' }, name: { type: 'string', default: 'bvp-established' } } });
const count = z.coerce.number().int().min(2).max(50).parse(values.count);
const name = slugSchema.parse(values.name);
const sourceUrl = 'https://cloudindex.bvp.com/companies';
const snapshotSchema = z.object({
  _meta: metaSchema, source: z.literal(sourceUrl), fetchedAt: z.iso.datetime(), htmlSha256: z.string(),
  constituents: z.array(z.object({ symbol: z.string().regex(/^[A-Z]+$/), name: z.string() })),
  selectedSymbols: z.array(z.string()), resolved: z.array(resolvedWebsiteSchema),
});
const snapshotPath = join(projectRoot, `data/sources/${name}.json`);
let snapshot;
try { snapshot = await readJson(snapshotPath, snapshotSchema); }
catch (error) {
  if (!isMissing(error)) throw error;
  const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`BVP source HTTP ${response.status}`);
  const html = await response.text();
  const embedded = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html)?.[1];
  if (!embedded) throw new Error('The source no longer exposes its constituent data.');
  const data = z.object({ props: z.object({ pageProps: z.object({ capIq: snapshotSchema.shape.constituents }) }) }).parse(JSON.parse(embedded));
  const constituents = data.props.pageProps.capIq.sort((a, b) => a.name.toLowerCase() < b.name.toLowerCase() ? -1
    : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : a.symbol.localeCompare(b.symbol));
  if (constituents.length < count || new Set(constituents.map((company) => company.symbol)).size !== constituents.length) throw new Error('Invalid constituent population.');
  snapshot = snapshotSchema.parse({
    _meta: metadata('Freezes public BVP cloud index membership and Wikidata homepage provenance.',
      'Pins the comparison selection before scraping or scoring any homepage.'),
    source: sourceUrl, fetchedAt: new Date().toISOString(), htmlSha256: createHash('sha256').update(html).digest('hex'),
    constituents, selectedSymbols: Array.from({ length: count }, (_, index) => constituents[Math.round(index * (constituents.length - 1) / (count - 1))]?.symbol), resolved: [],
  });
  await writeJson(snapshotPath, snapshot);
}
if (snapshot.selectedSymbols.length !== count) throw new Error('The pinned source uses another count; create a different cohort name.');
const overrides = await readJson(join(projectRoot, 'data/sources/bvp-homepage-overrides.json'), z.object({
  _meta: metaSchema, verifiedAt: z.iso.datetime(), companies: z.array(z.object({ symbol: z.string(), website: homepageSchema, source: z.url(), reason: z.string() })),
}));
for (const override of overrides.companies) {
  if (!snapshot.selectedSymbols.includes(override.symbol)) continue;
  const company = snapshot.constituents.find((company) => company.symbol === override.symbol);
  if (!company) throw new Error('An override does not identify a source constituent.');
  snapshot.resolved = snapshot.resolved.filter((entry) => entry.symbol !== override.symbol);
  snapshot.resolved.push({ symbol: company.symbol, name: company.name, website: override.website,
    match: 'official-site', source: override.source, verifiedAt: overrides.verifiedAt });
}
snapshot.resolved.sort((a, b) => a.symbol.localeCompare(b.symbol));
await writeJson(snapshotPath, snapshot);
const pending = snapshot.constituents.filter((company) => snapshot.selectedSymbols.includes(company.symbol)
  && !snapshot.resolved.some((resolved) => resolved.symbol === company.symbol));
for (let index = 0; index < pending.length; index += 2) {
  const group = pending.slice(index, index + 2);
  const outcomes = await Promise.allSettled(group.map(resolveHomepage));
  for (const [offset, outcome] of outcomes.entries()) {
    if (outcome.status === 'fulfilled') {
      snapshot.resolved.push(outcome.value);
      process.stdout.write(`${outcome.value.symbol}: ${outcome.value.website} (${outcome.value.match})\n`);
    } else {
      const message = outcome.reason instanceof Error ? outcome.reason.message : 'Unknown metadata error';
      process.stderr.write(`${group[offset]?.symbol}: ${message}; selection unchanged.\n`);
      if (message.includes('HTTP 429')) throw new Error('Metadata service rate limited this request; pinned membership is preserved.');
    }
  }
  snapshot.resolved.sort((a, b) => a.symbol.localeCompare(b.symbol));
  await writeJson(snapshotPath, snapshot);
}
if (snapshot.resolved.length !== count) throw new Error(`Resolved ${snapshot.resolved.length}/${count}. No cohort crawl started; resolve remaining metadata without replacing members.`);
const cohort = cohortSchema.parse({
  _meta: metadata('Defines the pinned established-company comparison cohort.',
    'Enables the same budgeted crawler and deterministic scorer for an external cohort.'),
  id: name, label: 'BVP public cloud comparison', source: sourceUrl, sourceFetchedAt: snapshot.fetchedAt,
  strategy: `Select ${count} evenly spaced positions from ${snapshot.constituents.length} names sorted alphabetically; homepage provenance is in data/sources/${name}.json. IDs are 1000000000 plus the base-36 ticker.`,
  companies: snapshot.selectedSymbols.map((symbol) => {
    const resolved = snapshot.resolved.find((company) => company.symbol === symbol);
    if (!resolved) throw new Error('Missing resolved member.');
    return { id: 1_000_000_000 + parseInt(symbol, 36), slug: `bvp-${symbol.toLowerCase()}`, name: resolved.name,
      website: `${new URL(resolved.website).origin}/`, batch: 'BVP public cloud comparison', status: 'Active', oneLiner: '', logoUrl: null };
  }),
});
await writeJson(join(projectRoot, `data/cohorts/${name}.json`), cohort);
process.stdout.write(`Pinned ${cohort.companies.length} companies. Context.dev credits used: 0.\n`);
