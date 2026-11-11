// Checks medians, zero-hit denominators, and aggregate bingo coverage.
// Prevents failures, repeated words, or the FREE centre from distorting comparisons.
import test from "node:test";
import assert from "node:assert/strict";
import { median, summarizeCohort } from "../src/comparison.js";
import { cohortBingo, evaluateBingo } from "../src/bingo.js";
import { scoreText } from "../src/score.js";
import type { CompanyResult, ScoredCompany } from "../src/results.js";

function scored(slug: string, phrase: string): ScoredCompany {
  const score = scoreText(`${phrase} ${Array(50).fill("ordinary").join(" ")}`);
  if (score.status !== "scored")
    throw new Error("Fixture must have enough visible text.");
  const { normalizedText, matches, ...result } = score;
  return {
    id: 1,
    slug,
    name: slug,
    batch: "Test cohort",
    website: "https://example.com/",
    source: null,
    ...result,
    phraseEvidence: [],
    excerpts: [],
  };
}

test("median handles odd, even, zero, and empty cohorts without rounding company densities", () => {
  assert.equal(median([9, 1, 2]), 2);
  assert.equal(median([0, 0, 2, 6]), 1);
  assert.equal(median([0]), 0);
  assert.equal(median([]), null);
  assert.equal(median([0.111, 0.222]), 0.1665);
});

test("cohort zero-hit percentage excludes unscored pages and remains null when nothing scored", () => {
  const zero = scored("zero", "");
  const positive = scored("positive", "robust");
  const failed: CompanyResult = {
    id: 3,
    slug: "failed",
    name: "Failed",
    batch: "Test cohort",
    website: "https://example.com/",
    source: null,
    status: "unscored",
    reason: "timeout",
    wordCount: null,
  };
  const summary = summarizeCohort([zero, positive, failed]);
  assert.equal(summary.selected, 3);
  assert.equal(summary.scored, 2);
  assert.equal(summary.unscored, 1);
  assert.equal(summary.zeroHits, 1);
  assert.equal(summary.zeroHitPercent, 50);
  assert.equal(summary.medianDensity, positive.density / 2);
  const empty = summarizeCohort([failed]);
  assert.equal(empty.zeroHitPercent, null);
  assert.equal(empty.medianDensity, null);
});

test("batch-wide cells count each company once, not repeated phrase occurrences", () => {
  const result = cohortBingo([
    {
      phraseCounts: [
        { id: "ai-powered", count: 25 },
        { id: "ai-powered", count: 1 },
      ],
    },
    {
      phraseCounts: [
        { id: "ai-powered", count: 1 },
        { id: "seamless", count: 10 },
      ],
    },
    { phraseCounts: [{ id: "robust", count: 3 }] },
  ]);
  assert.equal(result.scoredCompanies, 3);
  assert.equal(result.cells[0]?.companiesHit, 2);
  assert.equal(result.cells[1]?.companiesHit, 1);
  assert.equal(result.cells[2]?.companiesHit, 0);
  assert.equal(result.cells[12]?.companiesHit, null);
  assert.equal(result.cells[12]?.hit, true);
});

test("best line reports progress with FREE and returns all tied best lines", () => {
  const empty = evaluateBingo([]);
  assert.equal(empty.bestLine.hits, 1);
  assert.equal(empty.bestLine.total, 5);
  assert.deepEqual(empty.bestLine.lineIds, [
    "row-3",
    "column-3",
    "diagonal-main",
    "diagonal-anti",
  ]);
  const partial = evaluateBingo(["the-future-of", "leverage"]);
  assert.equal(partial.bestLine.hits, 3);
  assert.deepEqual(partial.bestLine.lineIds, ["row-3"]);
  assert.equal(partial.hasBingo, false);
  const full = evaluateBingo([
    "the-future-of",
    "leverage",
    "supercharge",
    "ai-native",
  ]);
  assert.equal(full.bestLine.hits, 5);
  assert.equal(full.hasBingo, true);
});
