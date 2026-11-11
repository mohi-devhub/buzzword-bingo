// Loads authoritative score JSON and derives the static site's comparison values.
// Prevents hardcoded results, stale comparison exports, or network calls during builds.
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { exclusionsSchema, metaSchema, slugSchema } from "./data.js";
import { normalizeUrl } from "./cache.js";
import { readJson } from "./files.js";
import {
  scoreFileSchema,
  type CompanyResult,
  type ScoredCompany,
} from "./results.js";
import { summarizeCohort } from "./comparison.js";
import { highlightedHtml } from "./highlight.js";

const projectRoot = process.cwd();

const configSchema = z.object({
  _meta: metaSchema,
  provisional: z.boolean(),
  comparisonCohort: slugSchema,
  OPT_OUT_URL: z.url(),
  optOutRepositoryReady: z.boolean(),
});
export type SiteCohort = ReturnType<typeof makeCohort>;
function makeCohort(
  kind: "startups" | "incumbents",
  score: z.infer<typeof scoreFileSchema>,
) {
  return {
    kind,
    score,
    label:
      kind === "startups"
        ? `Startups (YC ${score.batch})`
        : "Incumbents (public cloud)",
    shortLabel: kind === "startups" ? "Startups" : "Incumbents",
    summary: summarizeCohort(score.companies),
  };
}

async function loadSite() {
  const config = await readJson(
    join(projectRoot, "data/site.json"),
    configSchema,
  );
  const weeks = (await readdir(join(projectRoot, "data/scores")))
    .filter((path) => /^\d{4}-W\d{2}\.json$/.test(path))
    .sort();
  const latest = weeks.at(-1);
  if (!latest) throw new Error("Build requires saved score JSON.");
  const week = latest.replace(".json", "");
  const startup = await readJson(
    join(projectRoot, `data/scores/${latest}`),
    scoreFileSchema,
  );
  const incumbent = await readJson(
    join(projectRoot, `data/scores/${week}/${config.comparisonCohort}.json`),
    scoreFileSchema,
  );
  const signature = (score: typeof startup) =>
    JSON.stringify([
      score.scoringVersion,
      score.formula,
      score.dictionary,
      score.card,
    ]);
  if (signature(startup) !== signature(incumbent))
    throw new Error("Site comparison requires identical frozen scoring rules.");
  const exclusions = await readJson(
    join(projectRoot, "data/exclusions.json"),
    exclusionsSchema,
  );
  const excludedUrls = new Set(exclusions.normalizedUrls.map(normalizeUrl));
  for (const score of [startup, incumbent])
    score.companies = score.companies.filter(
      (company) =>
        !exclusions.companyIds.includes(company.id) &&
        !excludedUrls.has(normalizeUrl(company.website)),
    );
  const startups = makeCohort("startups", startup);
  const incumbents = makeCohort("incumbents", incumbent);
  const cohorts = [startups, incumbents];
  const allCompanies = cohorts.flatMap((cohort) =>
    cohort.score.companies.map((company) => ({ company, cohort })),
  );
  if (
    new Set(allCompanies.map(({ company }) => company.slug)).size !==
    allCompanies.length
  )
    throw new Error("Company routes must have unique slugs.");
  const agentic = cohorts.map((cohort) => {
    const phrase = cohort.summary.phrases.find(
      (phrase) => phrase.id === "agentic",
    );
    if (!phrase) throw new Error("The frozen dictionary must contain agentic.");
    return {
      ...phrase,
      label: cohort.shortLabel,
      scored: cohort.summary.scored,
      sharePercent: cohort.summary.scored
        ? (100 * phrase.companiesHit) / cohort.summary.scored
        : null,
    };
  });
  return {
    config,
    week,
    startups,
    incumbents,
    cohorts,
    allCompanies,
    dictionary: startup.dictionary,
    formula: startup.formula,
    scoringVersion: startup.scoringVersion,
    agentic,
  };
}

let loaded: ReturnType<typeof loadSite> | undefined;
export function siteData() {
  return (loaded ??= loadSite());
}
export const formatDensity = (value: number | null, digits = 3) =>
  value === null ? "—" : value.toFixed(digits);
export const formatPercent = (value: number | null) =>
  value === null ? "—" : `${value.toFixed(1)}%`;
export const sitePath = (path: string) =>
  `${import.meta.env.BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;

export function topPhrases(company: ScoredCompany) {
  return company.phraseCounts
    .map((phrase, index) => ({ ...phrase, index }))
    .filter((phrase) => phrase.count > 0)
    .sort(
      (a, b) =>
        b.weightedHits - a.weightedHits ||
        b.count - a.count ||
        a.index - b.index,
    )
    .slice(0, 3);
}

export function companyEvidence(company: CompanyResult) {
  return company.status === "scored"
    ? company.excerpts.map((snippet) => ({
        ...snippet,
        html: highlightedHtml(snippet.text, snippet.matches),
      }))
    : [];
}

export async function companyHistory(
  company: CompanyResult,
  cohort: SiteCohort,
) {
  const weeks = (await readdir(join(projectRoot, "data/scores")))
    .filter((path) => /^\d{4}-W\d{2}\.json$/.test(path))
    .sort();
  const history = [];
  for (const filename of weeks) {
    const week = filename.replace(".json", "");
    const path =
      cohort.kind === "startups"
        ? `data/scores/${filename}`
        : `data/scores/${week}/${cohort.score.sample}.json`;
    try {
      const scores = await readJson(join(projectRoot, path), scoreFileSchema);
      const result = scores.companies.find((entry) => entry.id === company.id);
      if (result?.status === "scored")
        history.push({
          week,
          density: result.density,
          version: scores.scoringVersion,
        });
    } catch (error) {
      if (!(
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ))
        throw error;
    }
  }
  return history;
}
