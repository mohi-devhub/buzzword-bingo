// Collects a limited sample while reserving credits before each request.
// Reuses prior attempts and keeps an auditable journal through partial failures.
import { randomUUID, createHash } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import {
  cachedAttempt,
  isoWeek,
  isFirstMonday,
  normalizeUrl,
  readScrapes,
} from "./cache.js";
import {
  metadata,
  policySchema,
  runSchema,
  scrapeSchema,
  type Run,
  type Scrape,
} from "./data.js";
import { selectCohort } from "./cohorts.js";
import {
  createScraper,
  estimatedCredit,
  type ScrapeHomepage,
} from "./context.js";
import { jsonFiles, readJson, writeJson } from "./files.js";

export function creditTotals(runs: Run[], date: Date) {
  const requests = runs.flatMap((run) => run.requests);
  return {
    total: requests.reduce((sum, request) => sum + request.credits.consumed, 0),
    monthly: requests
      .filter(
        (request) =>
          request.submittedAt.slice(0, 7) === date.toISOString().slice(0, 7),
      )
      .reduce((sum, request) => sum + request.credits.consumed, 0),
    remaining:
      requests
        .filter(
          (request) =>
            request.submittedAt.slice(0, 7) === date.toISOString().slice(0, 7),
        )
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
        .find((request) => request.credits.remaining !== null)?.credits
        .remaining ?? null,
  };
}

export async function crawl(options: {
  root: string;
  limit: number;
  batch?: string;
  sample?: string;
  cohort?: string;
  refresh: boolean;
  clock?: () => Date;
  scraperFactory?: () => Promise<ScrapeHomepage>;
  progress?: (event: object) => void;
  beforeRequest?: () => Promise<void>;
}) {
  const { root, limit, refresh } = options;
  const clock = options.clock ?? (() => new Date());
  const policy = await readJson(join(root, "data/policy.json"), policySchema);
  if (
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > policy.maxCompaniesPerRun
  ) {
    throw new Error(
      `--limit must be an integer from 1 to ${policy.maxCompaniesPerRun}; larger crawls need an approved policy edit.`,
    );
  }
  if (refresh && !isFirstMonday(clock()))
    throw new Error(
      "--refresh is allowed only on the first Monday of the month in UTC.",
    );
  const cohort = await selectCohort(root, options);
  if (options.batch && cohort.label !== options.batch)
    throw new Error("Import the requested batch before crawling it.");
  const selected = cohort.companies.slice(0, limit);
  const lock = join(root, ".crawl.lock");
  try {
    await mkdir(lock);
  } catch {
    throw new Error(
      "A crawl lock exists. Confirm that the previous process has exited before removing .crawl.lock.",
    );
  }

  const run: Run = {
    _meta: metadata(
      "Records a limited crawl and each reserved or reported request charge.",
      "Makes credit spend and interrupted attempts auditable without exposing credentials.",
    ),
    id: randomUUID(),
    startedAt: clock().toISOString(),
    finishedAt: null,
    batch: cohort.label,
    limit,
    refresh,
    selectedSlugs: selected.map((company) => company.slug),
    requests: [],
    cacheHits: [],
    deferred: [],
  };
  const runPath = join(root, `data/runs/${run.id}.json`);
  try {
    const runs: Run[] = [];
    for (const path of await jsonFiles(join(root, "data/runs")))
      runs.push(await readJson(path, runSchema));
    runs.push(run);
    const records = await readScrapes(root);
    await writeJson(runPath, run);
    const journal = runs.flatMap((entry) =>
      entry.requests.map((request) => ({
        normalizedUrl: request.normalizedUrl,
        attemptedAt: request.submittedAt,
        week: isoWeek(new Date(request.submittedAt)),
      })),
    );
    let scrape: ScrapeHomepage | undefined;
    let halt = false;
    for (const company of selected) {
      const date = clock();
      const normalizedUrl = normalizeUrl(company.website);
      const cached = cachedAttempt(records, normalizedUrl, date, refresh);
      if (cached) {
        run.cacheHits.push(company.slug);
        await writeJson(
          join(root, `.local/scrapes/${cached.week}/${company.slug}.json`),
          {
            ...cached,
            companyId: company.id,
            slug: company.slug,
            companyName: company.name,
            batch: company.batch,
            requestedUrl: company.website,
          },
        );
        options.progress?.({
          company: company.name,
          status: "cached",
          outcome: cached.result.status,
          week: cached.week,
        });
        continue;
      }
      if (cachedAttempt(journal, normalizedUrl, date, refresh)) {
        run.cacheHits.push(company.slug);
        options.progress?.({
          company: company.name,
          status: "cached",
          outcome: "local_text_unavailable",
        });
        continue;
      }
      const credits = creditTotals(runs, date);
      const reason = halt
        ? "account_or_service_error"
        : run.requests.length >= policy.maxNewRequestsPerRun
          ? "run_request_allowance_exhausted"
          : runs.reduce((sum, entry) => sum + entry.requests.length, 0) >=
              policy.authorizedRequests
            ? "approved_request_allowance_exhausted"
            : credits.total + 1 > policy.authorizedCredits
              ? "approved_credit_allowance_exhausted"
              : credits.monthly + policy.externalMonthlyCredits + 1 >
                  policy.monthlyCredits
                ? "monthly_budget_exhausted"
                : credits.remaining !== null && credits.remaining < 1
                  ? "provider_balance_exhausted"
                  : undefined;
      if (reason) {
        run.deferred.push({ slug: company.slug, reason });
        continue;
      }
      scrape ??= await (options.scraperFactory?.() ?? createScraper(root));
      const record: Scrape = {
        _meta: metadata(
          "Stores a real Context.dev homepage attempt and its extracted visible text.",
          "Allows reproducible scoring and prevents another paid request for this URL and week.",
        ),
        companyId: company.id,
        slug: company.slug,
        companyName: company.name,
        batch: company.batch,
        requestedUrl: company.website,
        normalizedUrl,
        week: isoWeek(date),
        attemptId: randomUUID(),
        runId: run.id,
        attemptedAt: date.toISOString(),
        finishedAt: null,
        sdkVersion: "3.28.0",
        extractionVersion: "main-markdown-v1",
        requestId: null,
        credits: { ...estimatedCredit },
        result: { status: "pending", reason: "interrupted_or_in_flight" },
      };
      const request = {
        attemptId: record.attemptId,
        normalizedUrl,
        submittedAt: record.attemptedAt,
        credits: record.credits,
      };
      run.requests.push(request);
      await writeJson(runPath, run);
      const hash = createHash("sha256").update(normalizedUrl).digest("hex");
      const canonicalPath = join(
        root,
        `.local/cache/${record.week}/${hash}.json`,
      );
      const companyPath = join(
        root,
        `.local/scrapes/${record.week}/${company.slug}.json`,
      );
      await writeJson(canonicalPath, scrapeSchema.parse(record));
      await writeJson(companyPath, record);
      records.push(record);
      options.progress?.({
        company: company.name,
        status: "requesting",
        request: run.requests.length,
      });
      await options.beforeRequest?.();
      const outcome = await scrape(normalizedUrl);
      record.result = outcome.result;
      record.credits = outcome.credits;
      record.requestId = outcome.requestId;
      record.finishedAt = clock().toISOString();
      request.credits = outcome.credits;
      halt = outcome.halt;
      await writeJson(runPath, run);
      await writeJson(canonicalPath, scrapeSchema.parse(record));
      await writeJson(companyPath, record);
      options.progress?.({
        company: company.name,
        status: record.result.status,
        words: record.result.wordCount,
        credits: record.credits.consumed,
        creditSource: record.credits.source,
        ...(record.result.status === "unscored"
          ? { reason: record.result.reason }
          : {}),
      });
    }
    return run;
  } finally {
    run.finishedAt = clock().toISOString();
    try {
      await writeJson(runPath, run);
    } finally {
      await rm(lock, { recursive: true, force: true });
    }
    options.progress?.({
      runId: run.id,
      selected: run.selectedSlugs.length,
      cacheHits: run.cacheHits.length,
      newRequests: run.requests.length,
      deferred: run.deferred.length,
      creditsUsed: run.requests.reduce(
        (sum, request) => sum + request.credits.consumed,
        0,
      ),
      creditBasis:
        run.requests.length === 0
          ? "no requests"
          : run.requests.every(
                (request) => request.credits.source === "reported",
              )
            ? "provider-reported"
            : "includes conservative estimates; check Context.dev for the final balance",
    });
  }
}
