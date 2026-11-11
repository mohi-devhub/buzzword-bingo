// Defines validated company, scrape, and credit records.
// Keeps unknown network and JSON data outside the collection logic.
import { z } from 'zod';

export function metadata(what: string, why: string): z.infer<typeof metaSchema> {
  return { header: [what, why], schemaVersion: 1 };
}

export const metaSchema = z.object({ header: z.tuple([z.string(), z.string()]), schemaVersion: z.literal(1) });
export const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const homepageSchema = z.url().refine((value) => {
  const url = new URL(value);
  return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
    && !/(^|\.)ycombinator\.com$/i.test(url.hostname)
    && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
}, 'Expected a public company HTTP(S) homepage, not a YC directory URL');

export const companySchema = z.object({
  id: z.number().int().positive(), slug: slugSchema, name: z.string().min(1),
  website: homepageSchema, batch: z.string().min(1), status: z.literal('Active'),
  oneLiner: z.string(), logoUrl: z.url().nullable(),
});
export type Company = z.infer<typeof companySchema>;

export const batchCountSchema = z.object({
  batch: z.string(), endpoint: z.url(), total: z.number().int(),
  active: z.number().int(), activeWithWebsite: z.number().int(), eligible: z.number().int(),
});
export const companiesSchema = z.object({
  _meta: metaSchema, fetchedAt: z.iso.datetime(), sourceUpdatedAt: z.iso.datetime(),
  selectedBatch: z.string(), source: z.url(), batchCounts: z.array(batchCountSchema),
  companies: z.array(companySchema),
});
export type CompanyDataset = z.infer<typeof companiesSchema>;

export const exclusionsSchema = z.object({
  _meta: metaSchema, companyIds: z.array(z.number().int()), normalizedUrls: z.array(homepageSchema),
});
export const policySchema = z.object({
  _meta: metaSchema, maxCompaniesPerRun: z.number().int().positive(),
  maxNewRequestsPerRun: z.number().int().nonnegative().default(10),
  authorizedRequests: z.number().int().nonnegative().default(10),
  authorizedCredits: z.number().nonnegative(), monthlyCredits: z.number().nonnegative(),
  externalMonthlyCredits: z.number().nonnegative(),
});
export const creditsSchema = z.object({
  source: z.enum(['reported', 'estimated']), consumed: z.number().nonnegative(),
  remaining: z.number().nonnegative().nullable(),
});
export type Credits = z.infer<typeof creditsSchema>;

const contentSchema = z.object({
  finalUrl: z.string().nullable(), title: z.string().nullable(), metaDescription: z.string().nullable(),
  markdown: z.string(), text: z.string(), wordCount: z.number().int().nonnegative(),
});
export type Content = z.infer<typeof contentSchema>;
const resultSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('pending'), reason: z.literal('interrupted_or_in_flight') }),
  contentSchema.extend({ status: z.literal('scraped') }),
  contentSchema.extend({ status: z.literal('unscored'), reason: z.string() }),
]);
export const scrapeSchema = z.object({
  _meta: metaSchema, companyId: z.number().int(), slug: slugSchema, companyName: z.string(), batch: z.string(),
  requestedUrl: homepageSchema, normalizedUrl: homepageSchema, week: z.string().regex(/^\d{4}-W\d{2}$/),
  attemptId: z.uuid(), runId: z.uuid(), attemptedAt: z.iso.datetime(), finishedAt: z.iso.datetime().nullable(),
  sdkVersion: z.literal('3.28.0'), extractionVersion: z.literal('main-markdown-v1'),
  requestId: z.string().nullable(), credits: creditsSchema, result: resultSchema,
});
export type Scrape = z.infer<typeof scrapeSchema>;

export const requestSchema = z.object({
  attemptId: z.uuid(), normalizedUrl: homepageSchema, submittedAt: z.iso.datetime(),
  credits: creditsSchema,
});
export const runSchema = z.object({
  _meta: metaSchema, id: z.uuid(), startedAt: z.iso.datetime(), finishedAt: z.iso.datetime().nullable(),
  batch: z.string(), limit: z.number().int().positive(), refresh: z.boolean(),
  selectedSlugs: z.array(slugSchema), requests: z.array(requestSchema),
  cacheHits: z.array(slugSchema), deferred: z.array(z.object({ slug: slugSchema, reason: z.string() })),
});
export type Run = z.infer<typeof runSchema>;

export const sampleSchema = z.object({
  _meta: metaSchema, batch: z.string(), sourceFetchedAt: z.iso.datetime(),
  population: z.number().int().positive(), strategy: z.string(),
  companies: z.array(z.object({
    id: z.number().int().positive(), slug: slugSchema, position: z.number().int().positive(),
    cohort: z.enum(['original', 'expansion']),
  })),
});
export type Sample = z.infer<typeof sampleSchema>;

export const cohortSchema = z.object({
  _meta: metaSchema, id: slugSchema, label: z.string().min(1), source: z.url(),
  sourceFetchedAt: z.iso.datetime(), strategy: z.string(), companies: z.array(companySchema),
});
export type Cohort = z.infer<typeof cohortSchema>;
