// Checks that source failures, metadata, and ties produce fair public rankings.
// Prevents missing or short pages from winning the least-buzzwords view.
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { metadata, type Company, type Scrape } from "../src/data.js";
import {
  scoreCompany,
  rankCompanies,
  companyResultSchema,
} from "../src/results.js";
import { extractText } from "../src/extract.js";

const company: Company = {
  id: 1,
  slug: "example",
  name: "Example",
  website: "https://example.com/",
  status: "Active",
  batch: "Fall 2026",
  oneLiner: "10x AI-powered world-class",
  logoUrl: null,
};
const text = Array(50).fill("ordinary").join(" ");
const record: Scrape = {
  _meta: metadata(
    "Synthetic capture.",
    "Tests source boundaries without network calls.",
  ),
  companyId: 1,
  slug: "example",
  companyName: "Example",
  batch: "Fall 2026",
  requestedUrl: company.website,
  normalizedUrl: company.website,
  week: "2026-W46",
  attemptId: randomUUID(),
  runId: randomUUID(),
  attemptedAt: "2026-11-11T10:00:00Z",
  finishedAt: "2026-11-11T10:00:01Z",
  sdkVersion: "3.28.0",
  extractionVersion: "main-markdown-v1",
  requestId: null,
  credits: { source: "reported", consumed: 1, remaining: 999 },
  result: {
    status: "scraped",
    finalUrl: company.website,
    title: "AI-powered",
    metaDescription: "world-class",
    markdown: text,
    ...extractText(text),
  },
};

test("only visible homepage text counts, excluding metadata and directory descriptions", () => {
  const result = scoreCompany(company, { record });
  assert.equal(result.status === "scored" && result.density, 0);
});

test("missing, blocked, and interrupted captures have no score and cannot enter either ranking", () => {
  const missing = scoreCompany(company);
  const pending = scoreCompany(company, {
    record: {
      ...record,
      result: { status: "pending", reason: "interrupted_or_in_flight" },
    },
  });
  assert.equal(record.result.status, "scraped");
  if (record.result.status !== "scraped")
    throw new Error("The fixture must contain text.");
  const blocked = scoreCompany(company, {
    record: {
      ...record,
      result: { ...record.result, status: "unscored", reason: "blocked" },
    },
  });
  for (const result of [missing, pending, blocked]) {
    assert.equal(result.status, "unscored");
    assert.equal("density" in result, false);
  }
  assert.equal(rankCompanies([missing, pending, blocked]).length, 0);
  assert.equal(rankCompanies([missing, pending, blocked], "least").length, 0);
});

test("density ties use a stable slug order in both directions", () => {
  const zulu = scoreCompany({ ...company, slug: "zulu" }, { record });
  const alpha = scoreCompany({ ...company, slug: "alpha" }, { record });
  for (const direction of ["most", "least"] satisfies ("most" | "least")[]) {
    assert.deepEqual(
      rankCompanies([zulu, alpha], direction).map((result) => result.slug),
      ["alpha", "zulu"],
    );
  }
});

test("an inconsistent stored denominator fails rather than publishing a misleading score", () => {
  if (record.result.status !== "scraped")
    throw new Error("The fixture must contain text.");
  const corrupted = { ...record, result: { ...record.result, wordCount: 500 } };
  assert.throws(
    () => scoreCompany(company, { record: corrupted }),
    /word count differs/,
  );
});

test("public scores retain only displayed short evidence and source hashes", () => {
  if (record.result.status !== "scraped")
    throw new Error("Text fixture required");
  const visible = `AI-powered seamless ${Array(80).fill("private-body-word").join(" ")}`;
  const capture = {
    ...record,
    result: { ...record.result, ...extractText(visible), markdown: visible },
  };
  const published = scoreCompany(company, { record: capture });
  assert.equal(published.status, "scored");
  if (published.status !== "scored") throw new Error("Scored fixture required");
  assert.equal(published.rawHits, 2);
  assert.equal("matches" in published, false);
  assert.equal("path" in (published.source ?? {}), false);
  assert.match(published.source?.textHash ?? "", /^[a-f0-9]{64}$/);
  assert(
    published.excerpts.every((value) => value.text.split(/\s+/).length <= 12),
  );
  assert(published.excerpts.length <= 2);
  assert(!JSON.stringify(published).includes(visible));
  assert.equal(
    companyResultSchema.safeParse({ ...published, markdown: visible }).success,
    false,
  );
});
