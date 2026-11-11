// Plans whole-cohort crawl work within the existing credit and cadence limits.
// Keeps ordinary weekly runs from re-crawling and refuses partially affordable batches.
import { cachedAttempt, isFirstMonday, normalizeUrl } from "./cache.js";
import { creditTotals } from "./crawl.js";
import { policySchema, type Company, type Run, type Scrape } from "./data.js";
import type { z } from "zod";

export function planCollection(options: {
  companies: Company[];
  records: Scrape[];
  runs: Run[];
  date: Date;
  policy: z.infer<typeof policySchema>;
  refresh: boolean;
}) {
  if (options.refresh && !isFirstMonday(options.date))
    return { allowed: false, newRequests: 0, reason: "not_first_monday" };
  const newRequests = new Set(
    options.companies
      .filter(
        (company) =>
          !cachedAttempt(
            options.records,
            company.website,
            options.date,
            options.refresh,
          ),
      )
      .map((company) => normalizeUrl(company.website)),
  ).size;
  const credits = creditTotals(options.runs, options.date);
  const requestsUsed = options.runs.reduce(
    (total, run) => total + run.requests.length,
    0,
  );
  const remaining = Math.max(
    0,
    Math.min(
      options.policy.authorizedCredits - credits.total,
      options.policy.authorizedRequests - requestsUsed,
      options.policy.monthlyCredits -
        options.policy.externalMonthlyCredits -
        credits.monthly,
      credits.remaining ?? Infinity,
      options.policy.maxNewRequestsPerRun,
    ),
  );
  const reason =
    options.companies.length > options.policy.maxCompaniesPerRun
      ? "company_limit"
      : newRequests > remaining
        ? "whole_cohort_exceeds_budget"
        : newRequests === 0
          ? "cached"
          : "within_budget";
  return {
    allowed: reason === "within_budget",
    newRequests,
    remaining,
    reason,
  };
}
