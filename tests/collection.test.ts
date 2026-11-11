// Exercises credit limits, cache reuse, interrupted attempts, and monthly cadence.
// Proves repeat runs cannot spend more credits before real scraping is enabled.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  cachedAttempt,
  isoWeek,
  normalizeUrl,
  readScrapes,
} from "../src/cache.js";
import { crawl } from "../src/crawl.js";
import {
  emptyContent,
  type Outcome,
  type ScrapeHomepage,
} from "../src/context.js";
import { companiesSchema, metadata } from "../src/data.js";
import { readJson, writeJson } from "../src/files.js";
import { extractText } from "../src/extract.js";
import { tuningSample } from "../src/sampling.js";

const date = new Date("2026-11-11T10:00:00Z");
const successful: Outcome = {
  result: {
    ...emptyContent,
    status: "scraped",
    markdown: "Visible homepage text",
    text: Array(60).fill("visible").join(" "),
    wordCount: 60,
  },
  credits: { source: "reported", consumed: 1, remaining: 999 },
  requestId: "test-only",
  halt: false,
};

async function fixture(count = 1, sameUrl = false) {
  const root = await mkdtemp(join(tmpdir(), "buzzword-bingo-test-"));
  const meta = metadata(
    "Contains synthetic test records.",
    "Checks behavior without making paid network requests.",
  );
  await writeJson(join(root, "data/companies.json"), {
    _meta: meta,
    fetchedAt: date.toISOString(),
    sourceUpdatedAt: date.toISOString(),
    selectedBatch: "Fall 2026",
    source: "https://yc-oss.github.io/api/batches/fall-2026.json",
    batchCounts: [],
    companies: Array.from({ length: count }, (_, index) => ({
      id: index + 1,
      slug: `company-${index + 1}`,
      name: `Company ${index + 1}`,
      website: `https://example.com/${sameUrl ? "" : index + 1}`,
      batch: "Fall 2026",
      status: "Active",
      oneLiner: "",
      logoUrl: null,
    })),
  });
  await writeJson(join(root, "data/exclusions.json"), {
    _meta: meta,
    companyIds: [],
    normalizedUrls: [],
  });
  await writeJson(join(root, "data/policy.json"), {
    _meta: meta,
    maxCompaniesPerRun: 10,
    authorizedCredits: 10,
    monthlyCredits: 1000,
    externalMonthlyCredits: 0,
  });
  return { root, cleanup: () => rm(root, { recursive: true, force: true }) };
}

test("a second crawl reuses real saved files without loading a credential or sending a request", async () => {
  const setup = await fixture(10);
  try {
    let calls = 0;
    const scraperFactory = async (): Promise<ScrapeHomepage> => async () => {
      calls++;
      return successful;
    };
    const first = await crawl({
      root: setup.root,
      limit: 10,
      refresh: false,
      clock: () => date,
      scraperFactory,
    });
    const second = await crawl({
      root: setup.root,
      limit: 10,
      refresh: false,
      clock: () => date,
      scraperFactory: async () => {
        throw new Error("A cache-only run must not load a key.");
      },
    });
    assert.equal(calls, 10);
    assert.equal(first.requests.length, 10);
    assert.equal(second.requests.length, 0);
    assert.equal(second.cacheHits.length, 10);
  } finally {
    await setup.cleanup();
  }
});

test("shared URLs incur one request across two companies", async () => {
  const setup = await fixture(2, true);
  try {
    const run = await crawl({
      root: setup.root,
      limit: 2,
      refresh: false,
      clock: () => date,
      scraperFactory: async () => async () => successful,
    });
    assert.equal(run.requests.length, 1);
    assert.equal(run.cacheHits.length, 1);
  } finally {
    await setup.cleanup();
  }
});

test("failed and interrupted requests are never retried in their week", async () => {
  for (const interrupted of [false, true]) {
    const setup = await fixture();
    try {
      const action = crawl({
        root: setup.root,
        limit: 1,
        refresh: false,
        clock: () => date,
        scraperFactory: async () => async () => {
          if (interrupted)
            throw new Error(
              "Simulated process interruption after request reservation",
            );
          return {
            ...successful,
            result: { ...emptyContent, status: "unscored", reason: "timeout" },
          };
        },
      });
      if (interrupted) await assert.rejects(action);
      else await action;
      const run = await crawl({
        root: setup.root,
        limit: 1,
        refresh: false,
        clock: () => date,
        scraperFactory: async () => {
          throw new Error("Must not retry.");
        },
      });
      assert.equal(run.requests.length, 0);
      assert.equal(run.cacheHits.length, 1);
    } finally {
      await setup.cleanup();
    }
  }
});

test("a new week reuses old text; refresh is allowed only on the next month first Monday", async () => {
  const setup = await fixture();
  try {
    const options = {
      root: setup.root,
      limit: 1,
      refresh: false,
      scraperFactory: async () => async () => successful,
    };
    await crawl({ ...options, clock: () => date });
    const nextWeek = new Date("2026-11-16T04:17:00Z");
    const weekly = await crawl({ ...options, clock: () => nextWeek });
    assert.equal(weekly.requests.length, 0);
    await assert.rejects(
      crawl({ ...options, refresh: true, clock: () => nextWeek }),
      /first Monday/,
    );
    const monday = new Date("2026-12-07T04:17:00Z");
    const refreshed = await crawl({
      ...options,
      refresh: true,
      clock: () => monday,
    });
    assert.equal(refreshed.requests.length, 1);
    const repeated = await crawl({
      ...options,
      refresh: true,
      clock: () => monday,
    });
    assert.equal(repeated.requests.length, 0);
    const records = await readScrapes(setup.root);
    assert.ok(
      cachedAttempt(
        records,
        "https://example.com/1",
        new Date("2026-12-14T04:17:00Z"),
        true,
      ),
    );
  } finally {
    await setup.cleanup();
  }
});

test("limits and a depleted allowance prevent network access", async () => {
  const setup = await fixture(2);
  try {
    const options = {
      root: setup.root,
      limit: 11,
      refresh: false,
      scraperFactory: async () => {
        throw new Error("No request allowed.");
      },
    };
    await assert.rejects(crawl(options), /approved policy edit/);
    await writeJson(join(setup.root, "data/policy.json"), {
      _meta: metadata("Test allowance.", "Prevents paid test calls."),
      maxCompaniesPerRun: 10,
      authorizedCredits: 0,
      monthlyCredits: 1000,
      externalMonthlyCredits: 0,
    });
    const run = await crawl({ ...options, limit: 2 });
    assert.equal(run.requests.length, 0);
    assert.equal(run.deferred.length, 2);
  } finally {
    await setup.cleanup();
  }
});

test("reported prices, monthly external usage, opt-outs, and the crawl lock prevent excess calls", async () => {
  const setup = await fixture(2);
  try {
    const options = {
      root: setup.root,
      limit: 2,
      refresh: false,
      clock: () => date,
      scraperFactory: async () => async () =>
        ({
          ...successful,
          credits: { source: "reported", consumed: 10, remaining: 990 },
        }) satisfies Outcome,
    };
    const run = await crawl(options);
    assert.equal(run.requests.length, 1);
    assert.equal(
      run.deferred[0]?.reason,
      "approved_credit_allowance_exhausted",
    );
    await writeJson(join(setup.root, "data/exclusions.json"), {
      _meta: metadata("Test opt-out.", "Prevents collection."),
      companyIds: [1],
      normalizedUrls: [],
    });
    const excluded = await crawl(options);
    assert.deepEqual(excluded.selectedSlugs, ["company-2"]);
    await writeJson(join(setup.root, "data/policy.json"), {
      _meta: metadata("Test monthly budget.", "Prevents collection."),
      maxCompaniesPerRun: 10,
      authorizedCredits: 100,
      monthlyCredits: 1000,
      externalMonthlyCredits: 990,
    });
    const monthly = await crawl(options);
    assert.equal(monthly.requests.length, 0);
    assert.equal(monthly.deferred[0]?.reason, "monthly_budget_exhausted");
    await mkdir(join(setup.root, ".crawl.lock"));
    await assert.rejects(crawl(options), /crawl lock exists/);
  } finally {
    await setup.cleanup();
  }
});

test("URL normalization preserves paths and query strings; ISO weeks handle year boundaries", () => {
  assert.equal(
    normalizeUrl("https://EXAMPLE.com:443/#hero"),
    "https://example.com/",
  );
  assert.equal(
    normalizeUrl("https://example.com/hello?ref=one#hero"),
    "https://example.com/hello?ref=one",
  );
  assert.equal(isoWeek(new Date("2027-01-01T00:00:00Z")), "2026-W53");
});

test("extraction keeps visible words and excludes markdown destinations, image descriptions, code, and HTML", () => {
  const result = extractText(
    "# Hello **world**\n\n[Read this](https://example.com/hidden) ![invisible](image.png)\n\n`secret`\n\n```js\nnot visible\n```\n\n<script>hidden</script>",
  );
  assert.equal(result.text, "Hello world\n\nRead this");
  assert.equal(result.wordCount, 4);
  assert.equal(extractText("AI-powered 10x teams’ work").wordCount, 4);
});

test("the pinned expansion keeps ten cached companies and adds twenty across the every-eighth grid", async () => {
  const setup = await fixture(225);
  try {
    const first = await crawl({
      root: setup.root,
      limit: 10,
      refresh: false,
      clock: () => date,
      scraperFactory: async () => async () => successful,
    });
    const dataset = await readJson(
      join(setup.root, "data/companies.json"),
      companiesSchema,
    );
    const sample = tuningSample(dataset, first.selectedSlugs);
    assert.equal(sample.companies.length, 30);
    assert.equal(
      new Set(sample.companies.map((company) => company.id)).size,
      30,
    );
    assert.equal(
      sample.companies.filter((company) => company.cohort === "original")
        .length,
      10,
    );
    const added = sample.companies.filter(
      (company) => company.cohort === "expansion",
    );
    assert.equal(added.length, 20);
    assert.ok(added.every((company) => (company.position - 1) % 8 === 0));
    assert.equal(added.at(-1)?.position, 225);
    await writeJson(join(setup.root, "data/samples/tuning.json"), sample);
    await writeJson(join(setup.root, "data/policy.json"), {
      _meta: metadata("Test expansion allowance.", "Caps additional calls."),
      maxCompaniesPerRun: 30,
      maxNewRequestsPerRun: 20,
      authorizedRequests: 30,
      authorizedCredits: 30,
      monthlyCredits: 1000,
      externalMonthlyCredits: 0,
    });
    const expanded = await crawl({
      root: setup.root,
      sample: "tuning",
      limit: 30,
      refresh: false,
      clock: () => date,
      scraperFactory: async () => async () => successful,
    });
    assert.equal(expanded.requests.length, 20);
    assert.equal(expanded.cacheHits.length, 10);
    assert.equal(expanded.deferred.length, 0);
    const repeated = await crawl({
      root: setup.root,
      sample: "tuning",
      limit: 30,
      refresh: false,
      clock: () => date,
      scraperFactory: async () => {
        throw new Error("The expanded sample must stay cached.");
      },
    });
    assert.equal(repeated.requests.length, 0);
    assert.equal(repeated.cacheHits.length, 30);
  } finally {
    await setup.cleanup();
  }
});

test("request-count allowances also apply when the provider reports a free response", async () => {
  const setup = await fixture(2);
  try {
    await writeJson(join(setup.root, "data/policy.json"), {
      _meta: metadata("Test request cap.", "Counts free responses too."),
      maxCompaniesPerRun: 30,
      maxNewRequestsPerRun: 20,
      authorizedRequests: 1,
      authorizedCredits: 30,
      monthlyCredits: 1000,
      externalMonthlyCredits: 0,
    });
    const run = await crawl({
      root: setup.root,
      limit: 2,
      refresh: false,
      clock: () => date,
      scraperFactory: async () => async () => ({
        ...successful,
        credits: { source: "reported", consumed: 0, remaining: 1000 },
      }),
    });
    assert.equal(run.requests.length, 1);
    assert.equal(
      run.deferred[0]?.reason,
      "approved_request_allowance_exhausted",
    );
  } finally {
    await setup.cleanup();
  }
});

test("a failed durable reservation prevents submission and leaves an unrepeatable pending attempt", async () => {
  const setup = await fixture();
  try {
    let submissions = 0;
    await assert.rejects(
      crawl({
        root: setup.root,
        limit: 1,
        refresh: false,
        clock: () => date,
        scraperFactory: async () => async () => {
          submissions++;
          return successful;
        },
        beforeRequest: async () => {
          const records = await readScrapes(setup.root);
          assert.equal(records[0]?.result.status, "pending");
          throw new Error("Remote reservation could not be persisted");
        },
      }),
      /Remote reservation/,
    );
    assert.equal(submissions, 0);
    const repeated = await crawl({
      root: setup.root,
      limit: 1,
      refresh: false,
      clock: () => date,
      scraperFactory: async () => {
        throw new Error("Reserved attempt must stay cached");
      },
    });
    assert.equal(repeated.requests.length, 0);
  } finally {
    await setup.cleanup();
  }
});

test("published request receipts prevent duplicate calls when the local store is missing", async () => {
  const setup = await fixture();
  try {
    await crawl({
      root: setup.root,
      limit: 1,
      refresh: false,
      clock: () => date,
      scraperFactory: async () => async () => successful,
    });
    await rm(join(setup.root, ".local"), { recursive: true, force: true });
    const run = await crawl({
      root: setup.root,
      limit: 1,
      refresh: false,
      clock: () => date,
      scraperFactory: async () => {
        throw new Error(
          "A fresh public clone must not repeat a recorded request",
        );
      },
    });
    assert.equal(run.requests.length, 0);
    assert.equal(run.cacheHits.length, 1);
  } finally {
    await setup.cleanup();
  }
});
