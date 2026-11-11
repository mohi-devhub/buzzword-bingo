// Imports company metadata from yc-oss and picks the newest eligible batch.
// Avoids direct YC requests and excludes inactive or invalid homepages.
import { join } from "node:path";
import { z } from "zod";
import { normalizeUrl } from "./cache.js";
import {
  companySchema,
  companiesSchema,
  exclusionsSchema,
  metadata,
  type Company,
} from "./data.js";
import { readJson, writeJson } from "./files.js";

const source = "https://yc-oss.github.io/api/";
const fallback = "https://raw.githubusercontent.com/yc-oss/api/main/";
const metaSchema = z.object({
  last_updated: z.iso.datetime(),
  batches: z.record(
    z.string(),
    z.object({ name: z.string(), api: z.url(), count: z.number() }),
  ),
});
const rawCompaniesSchema = z.array(
  z.object({
    id: z.number().int(),
    slug: z.string(),
    name: z.string(),
    batch: z.string(),
    status: z.string(),
    website: z.string().nullable().optional(),
    one_liner: z.string(),
    small_logo_thumb_url: z.string().nullable().optional(),
  }),
);

async function fetchSource(
  path: string,
): Promise<{ value: unknown; endpoint: string }> {
  for (const base of [source, fallback]) {
    try {
      const response = await fetch(`${base}${path}`, {
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) continue;
      const value: unknown = await response.json();
      return { value, endpoint: `${base}${path}` };
    } catch {
      /* Try the same public file on the alternate host. */
    }
  }
  throw new Error(`Both yc-oss sources failed for ${path}; no data replaced.`);
}

function batchOrder(name: string): number {
  const match = /^(Winter|Spring|Summer|Fall) (\d{4})$/.exec(name);
  if (!match) return -1;
  return (
    Number(match[2]) * 4 +
    ["Winter", "Spring", "Summer", "Fall"].indexOf(match[1] ?? "")
  );
}

export async function availableBatches() {
  const meta = metaSchema.parse((await fetchSource("meta.json")).value);
  return Object.values(meta.batches)
    .map((batch) => batch.name)
    .filter((name) => batchOrder(name) >= 0)
    .sort((a, b) => batchOrder(b) - batchOrder(a));
}

export async function importCompanies(
  root: string,
  requestedBatch?: string,
  options: { persist?: boolean } = {},
) {
  const exclusions = await readJson(
    join(root, "data/exclusions.json"),
    exclusionsSchema,
  );
  const meta = metaSchema.parse((await fetchSource("meta.json")).value);
  const batches = Object.entries(meta.batches).sort(
    (a, b) => batchOrder(b[1].name) - batchOrder(a[1].name),
  );
  const counts = [];
  let selected:
    { batch: string; source: string; companies: Company[] } | undefined;
  for (const [key, batch] of batches) {
    const neededForComparison = ["Fall 2026", "Summer 2026"].includes(
      batch.name,
    );
    if (selected && !neededForComparison) continue;
    if (requestedBatch && requestedBatch !== batch.name && !neededForComparison)
      continue;
    const response = await fetchSource(`batches/${key}.json`);
    const records = rawCompaniesSchema.parse(response.value);
    const active = records.filter((record) => record.status === "Active");
    const withWebsite = active.filter((record) => record.website?.trim());
    const eligible: Company[] = [];
    for (const record of withWebsite) {
      const parsed = companySchema.safeParse({
        id: record.id,
        slug: record.slug,
        name: record.name,
        batch: record.batch,
        status: record.status,
        website: record.website?.trim(),
        oneLiner: record.one_liner,
        logoUrl: record.small_logo_thumb_url || null,
      });
      if (!parsed.success) continue;
      if (parsed.data.batch !== batch.name)
        throw new Error("The source contains a company in the wrong batch.");
      if (
        exclusions.companyIds.includes(parsed.data.id) ||
        exclusions.normalizedUrls
          .map(normalizeUrl)
          .includes(normalizeUrl(parsed.data.website))
      )
        continue;
      eligible.push(parsed.data);
    }
    eligible.sort((a, b) =>
      a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : a.id - b.id,
    );
    if (
      new Set(eligible.map((company) => company.slug)).size !== eligible.length
    ) {
      throw new Error(
        "Duplicate company slugs require an explicit mapping before import.",
      );
    }
    counts.push({
      batch: batch.name,
      endpoint: response.endpoint,
      total: records.length,
      active: active.length,
      activeWithWebsite: withWebsite.length,
      eligible: eligible.length,
    });
    if (
      !selected &&
      (requestedBatch ? requestedBatch === batch.name : eligible.length >= 100)
    ) {
      selected = {
        batch: batch.name,
        source: response.endpoint,
        companies: eligible,
      };
    }
  }
  if (!selected)
    throw new Error(
      "No requested batch or newest batch with at least 100 eligible companies was found.",
    );
  const dataset = companiesSchema.parse({
    _meta: metadata(
      "Stores public company metadata from the yc-oss community API.",
      "Provides a reproducible active-company list without scraping YC directly.",
    ),
    fetchedAt: new Date().toISOString(),
    sourceUpdatedAt: meta.last_updated,
    selectedBatch: selected.batch,
    source: selected.source,
    batchCounts: counts,
    companies: selected.companies,
  });
  if (options.persist !== false)
    await writeJson(join(root, "data/companies.json"), dataset);
  return dataset;
}
