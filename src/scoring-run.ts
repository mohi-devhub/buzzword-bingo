// Scores a selected batch or cohort using only cached public homepage captures.
// Shares the exact weekly writer between the CLI and the scheduled refresh.
import { join } from "node:path";
import { buzzwords } from "./buzzwords.js";
import { bingoCard } from "./bingo.js";
import { normalizeUrl } from "./cache.js";
import { metadata, scrapeSchema, type Scrape } from "./data.js";
import { selectCohort } from "./cohorts.js";
import { jsonFiles, readJson, writeJson } from "./files.js";
import { scoreCompany, scoreFileSchema } from "./results.js";
import { formula, scoringVersion } from "./score.js";

export async function scoreSaved(options: {
  root: string;
  week: string;
  sample?: string;
  cohort?: string;
}) {
  const cohort = await selectCohort(options.root, options);
  const captures: { record: Scrape }[] = [];
  for (const path of await jsonFiles(join(options.root, ".local/scrapes"))) {
    const record = await readJson(path, scrapeSchema);
    if (record.week <= options.week) captures.push({ record });
  }
  const missing = cohort.companies.filter(
    (company) =>
      !captures.some(
        (capture) =>
          capture.record.companyId === company.id &&
          capture.record.normalizedUrl === normalizeUrl(company.website),
      ),
  );
  if (missing.length)
    throw new Error(
      `Local captures are required to re-score (${missing.length} unavailable). Restore .local/; static builds use committed scores without it.`,
    );
  captures.sort((a, b) =>
    b.record.attemptedAt.localeCompare(a.record.attemptedAt),
  );
  const companies = cohort.companies.map((company) =>
    scoreCompany(
      company,
      captures.find(
        (capture) =>
          capture.record.companyId === company.id &&
          capture.record.normalizedUrl === normalizeUrl(company.website),
      ),
    ),
  );
  const output = scoreFileSchema.parse({
    _meta: metadata(
      "Stores deterministic scores and bingo progress for a saved company cohort.",
      "Makes every count reproducible from public homepage text and frozen rules.",
    ),
    week: options.week,
    sample: cohort.id,
    batch: cohort.label,
    sourceFetchedAt: cohort.sourceFetchedAt,
    scoringVersion,
    formula,
    dictionary: buzzwords,
    card: bingoCard,
    companies,
  });
  const path = options.cohort
    ? `data/scores/${options.week}/${cohort.id}.json`
    : `data/scores/${options.week}.json`;
  await writeJson(join(options.root, path), output);
  return output;
}
