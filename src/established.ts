// Resolves company homepages from validated Wikidata metadata, without scraping them.
// Records identity and homepage provenance before any paid comparison crawl.
import { z } from 'zod';
import { homepageSchema } from './data.js';

const textSnak = z.object({ datavalue: z.object({ value: z.string() }).optional() });
const websiteClaim = z.object({
  id: z.string(), rank: z.enum(['preferred', 'normal', 'deprecated']), mainsnak: textSnak,
  qualifiers: z.object({
    P407: z.array(z.object({ datavalue: z.object({ value: z.object({ id: z.string() }) }).optional() })).optional(),
    P518: z.array(z.unknown()).transform((values) => values.length > 0).optional(),
  }).optional(),
});
const entitySchema = z.object({
  id: z.string().regex(/^Q\d+$/), lastrevid: z.number().int(),
  labels: z.object({ en: z.object({ value: z.string() }).optional() }),
  descriptions: z.object({ en: z.object({ value: z.string() }).optional() }),
  aliases: z.object({ en: z.array(z.object({ value: z.string() })).optional() }),
  claims: z.object({ P856: z.array(websiteClaim).optional(),
    P414: z.array(z.object({ qualifiers: z.object({ P249: z.array(textSnak).optional() }).optional() })).optional(),
    P249: z.array(z.object({ mainsnak: textSnak })).optional(),
  }),
});
const identitySchema = z.object({ symbol: z.string(), name: z.string(), website: homepageSchema });
export const resolvedWebsiteSchema = z.discriminatedUnion('match', [identitySchema.extend({
  symbol: z.string(), name: z.string(), entityId: z.string(), entityLabel: z.string(), revisionId: z.number().int(),
  website: homepageSchema, websiteStatementId: z.string(), match: z.enum(['ticker', 'name']),
}), identitySchema.extend({ match: z.literal('official-site'), source: z.url(), verifiedAt: z.iso.datetime() })]);
export type ResolvedWebsite = z.infer<typeof resolvedWebsiteSchema>;

export async function publicJson(url: string): Promise<unknown> {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000), headers: {
    'user-agent': 'BuzzwordBingo/0.1 (https://github.com/mohi-devhub; public company metadata research)', accept: 'application/json',
  } });
  if (!response.ok) throw new Error(`Metadata HTTP ${response.status}`);
  const value: unknown = await response.json();
  return value;
}

function api(parameters: Record<string, string>): string {
  return `https://www.wikidata.org/w/api.php?${new URLSearchParams({ format: 'json', ...parameters })}`;
}

const nameKey = (name: string) => name.toLowerCase().replace(/\b(incorporated|inc|corporation|corp|limited|ltd|plc|holdings|company)\b/g, '').replace(/[^a-z0-9]/g, '');

export async function resolveHomepage(company: { symbol: string; name: string }): Promise<ResolvedWebsite> {
  for (const query of [company.name, `${company.name} company`, `${company.name} software`]) {
    const search = z.object({ search: z.array(z.object({ id: z.string().regex(/^Q\d+$/) })) }).parse(
      await publicJson(api({ action: 'wbsearchentities', search: query, language: 'en', limit: '5' })));
    if (search.search.length === 0) continue;
    const response = z.object({ entities: z.record(z.string(), z.unknown()) }).parse(await publicJson(api({
      action: 'wbgetentities', ids: search.search.map((entry) => entry.id).join('|'),
      props: 'info|labels|descriptions|aliases|claims', languages: 'en',
    })));
    const candidates: { entity: z.infer<typeof entitySchema>; match: 'ticker' | 'name' }[] = [];
    for (const value of Object.values(response.entities)) {
      const parsed = entitySchema.safeParse(value);
      if (!parsed.success) continue;
      const entity = parsed.data;
      const tickers = [
        ...(entity.claims.P414 ?? []).flatMap((listing) => (listing.qualifiers?.P249 ?? []).flatMap((snak) => snak.datavalue ? [snak.datavalue.value] : [])),
        ...(entity.claims.P249 ?? []).flatMap((claim) => claim.mainsnak.datavalue ? [claim.mainsnak.datavalue.value] : []),
      ];
      const names = [entity.labels.en?.value ?? '', ...(entity.aliases.en ?? []).map((alias) => alias.value)];
      if (tickers.includes(company.symbol)) candidates.push({ entity, match: 'ticker' });
      else if (names.some((name) => nameKey(name) === nameKey(company.name))
        && /company|corporation|business|provider|developer|platform/i.test(entity.descriptions.en?.value ?? '')) {
        candidates.push({ entity, match: 'name' });
      }
    }
    const tickerMatches = candidates.filter((candidate) => candidate.match === 'ticker');
    const matches = tickerMatches.length ? tickerMatches : candidates;
    if (matches.length !== 1) continue;
    const chosen = matches[0];
    if (!chosen) continue;
    const websites = (chosen.entity.claims.P856 ?? []).flatMap((claim) => {
      const parsed = homepageSchema.safeParse(claim.mainsnak.datavalue?.value);
      if (!parsed.success || claim.rank === 'deprecated') return [];
      const url = new URL(parsed.data);
      if (/(^|\.)(twitter\.com|x\.com|facebook\.com|linkedin\.com|youtube\.com|wikipedia\.org)$/.test(url.hostname)) return [];
      return [{ claim, url, english: claim.qualifiers?.P407?.some((snak) => snak.datavalue?.value.id === 'Q1860') ?? false }];
    }).sort((a, b) => Number(a.claim.qualifiers?.P518 ?? false) - Number(b.claim.qualifiers?.P518 ?? false)
      || Number(b.english) - Number(a.english)
      || Number(b.claim.rank === 'preferred') - Number(a.claim.rank === 'preferred')
      || a.url.pathname.length - b.url.pathname.length
      || Number(b.url.protocol === 'https:') - Number(a.url.protocol === 'https:')
      || a.url.href.length - b.url.href.length || a.url.href.localeCompare(b.url.href));
    const website = websites[0];
    if (!website) continue;
    return resolvedWebsiteSchema.parse({ ...company, entityId: chosen.entity.id,
      entityLabel: chosen.entity.labels.en?.value ?? company.name, revisionId: chosen.entity.lastrevid,
      website: website.url.href, websiteStatementId: website.claim.id, match: chosen.match });
  }
  throw new Error('No unambiguous company homepage metadata found.');
}
