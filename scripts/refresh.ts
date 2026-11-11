// Completes affordable batches, performs first-Monday refreshes, and re-scores saved text.
// Runs safely without credentials when the persisted budget permits no paid work.
import { join } from "node:path";
import { parseArgs } from "node:util";
import { z } from "zod";
import {
  cachedAttempt,
  isoWeek,
  isFirstMonday,
  readScrapes,
} from "../src/cache.js";
import { availableBatches, importCompanies } from "../src/companies.js";
import { selectCohort } from "../src/cohorts.js";
import { crawl, creditTotals } from "../src/crawl.js";
import {
  cohortSchema,
  metadata,
  policySchema,
  runSchema,
  slugSchema,
} from "../src/data.js";
import { jsonFiles, projectRoot, readJson, writeJson } from "../src/files.js";
import { planCollection } from "../src/refresh.js";
import { scoreSaved } from "../src/scoring-run.js";

if (process.env.GITHUB_ACTIONS === "true")
  throw new Error(
    "Crawling and re-scoring are manual local operations; CI builds committed public data only.",
  );

const { values } = parseArgs({
  options: {
    "no-discovery": { type: "boolean", default: false },
  },
});
const date = new Date();
const week = isoWeek(date);
const policy = await readJson(
  join(projectRoot, "data/policy.json"),
  policySchema,
);
const site = z
  .object({ comparisonCohort: slugSchema })
  .parse(await readJson(join(projectRoot, "data/site.json"), z.unknown()));
const log = (event: object) =>
  process.stdout.write(`${JSON.stringify(event)}\n`);
const loadRuns = async () =>
  Promise.all(
    (await jsonFiles(join(projectRoot, "data/runs"))).map((path) =>
      readJson(path, runSchema),
    ),
  );
const before = creditTotals(await loadRuns(), date).total;
let failures = 0;
try {
  const primary = await selectCohort(projectRoot, {});
  const pinned = [];
  for (const path of await jsonFiles(join(projectRoot, "data/cohorts")))
    pinned.push(await readJson(path, cohortSchema));
  const knownRecords = await readScrapes(projectRoot);
  const entries = await Promise.all(
    [
      { id: undefined, label: primary.label },
      ...pinned.map((c) => ({ id: c.id, label: c.label })),
    ].map(async (entry) => {
      const cohort = await selectCohort(
        projectRoot,
        entry.id ? { cohort: entry.id } : {},
      );
      const dates = cohort.companies.map(
        (c) =>
          cachedAttempt(knownRecords, c.website, date, false)?.attemptedAt ??
          "",
      );
      return { ...entry, cohort, oldestCapture: dates.sort()[0] ?? "" };
    }),
  );
  // Missing captures first, then the cohort with the oldest saved observation.
  entries.sort(
    (a, b) =>
      a.oldestCapture.localeCompare(b.oldestCapture) ||
      a.label.localeCompare(b.label),
  );
  for (const entry of entries) {
    const cohort = entry.cohort;
    const records = await readScrapes(projectRoot);
    const incomplete = cohort.companies.some(
      (c) => !cachedAttempt(records, c.website, date, false),
    );
    const refresh = !incomplete && isFirstMonday(date);
    if (!incomplete && !refresh) continue;
    const plan = planCollection({
      companies: cohort.companies,
      records,
      runs: await loadRuns(),
      date,
      policy,
      refresh,
    });
    log({ cohort: entry.label, refresh, ...plan });
    if (!plan.allowed) continue;
    const run = await crawl({
      root: projectRoot,
      limit: cohort.companies.length,
      refresh,
      ...(entry.id ? { cohort: entry.id } : {}),
      progress: log,
    });
    if (run.deferred.length) failures++;
  }
  // Newest untouched qualifying YC batch is the single next candidate; never cherry-pick a cheaper older one.
  if (!values["no-discovery"]) {
    const records = await readScrapes(projectRoot);
    const known = new Set([
      primary.label,
      ...pinned.map((c) => c.label),
      ...records.map((record) => record.batch),
    ]);
    for (const batch of await availableBatches()) {
      if (known.has(batch)) continue;
      const dataset = await importCompanies(projectRoot, batch, {
        persist: false,
      });
      if (dataset.companies.length < 100) continue;
      const plan = planCollection({
        companies: dataset.companies,
        records,
        runs: await loadRuns(),
        date,
        policy,
        refresh: false,
      });
      log({ nextBatch: batch, ...plan });
      if (plan.allowed || plan.reason === "cached") {
        const id = `yc-${batch.toLowerCase().replaceAll(" ", "-")}`;
        await writeJson(
          join(projectRoot, `data/cohorts/${id}.json`),
          cohortSchema.parse({
            _meta: metadata(
              "Pins a qualifying next YC batch before any homepage crawl.",
              "Makes weekly additions reproducible and independent of buzzword outcomes.",
            ),
            id,
            label: batch,
            source: dataset.source,
            sourceFetchedAt: dataset.fetchedAt,
            strategy:
              "All active companies with valid websites from this pinned yc-oss snapshot.",
            companies: dataset.companies,
          }),
        );
        const run = await crawl({
          root: projectRoot,
          limit: dataset.companies.length,
          cohort: id,
          refresh: false,
          progress: log,
        });
        if (run.deferred.length) failures++;
      }
      break;
    }
  }
} catch (error) {
  failures++;
  log({
    status: "collection_failed",
    reason: error instanceof Error ? error.message : "Unknown failure",
  });
} finally {
  await scoreSaved({ root: projectRoot, week });
  for (const path of await jsonFiles(join(projectRoot, "data/cohorts"))) {
    const cohort = await readJson(path, cohortSchema);
    await scoreSaved({ root: projectRoot, week, cohort: cohort.id });
  }
  const runs = await loadRuns();
  log({
    week,
    failures,
    creditsUsed: creditTotals(runs, date).total - before,
    cumulativeCredits: creditTotals(runs, date).total,
    comparisonCohort: site.comparisonCohort,
  });
}
if (failures) process.exitCode = 2;
