// Verifies that manual scoring refuses missing private captures without replacing public data.
// Prevents weekly jobs from silently reverting to the earlier thirty-company tuning cohort.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scoreSaved } from "../src/scoring-run.js";
import { metadata } from "../src/data.js";
import { writeJson } from "../src/files.js";

test("scoring without the local store preserves committed scores", async () => {
  const root = await mkdtemp(join(tmpdir(), "bingo-full-score-"));
  const meta = metadata(
    "Defines a synthetic full-batch fixture.",
    "Checks selection without credentials or homepage requests.",
  );
  try {
    await writeJson(join(root, "data/exclusions.json"), {
      _meta: meta,
      companyIds: [],
      normalizedUrls: [],
    });
    await writeJson(join(root, "data/companies.json"), {
      _meta: meta,
      fetchedAt: "2026-11-11T10:00:00Z",
      sourceUpdatedAt: "2026-11-11T10:00:00Z",
      selectedBatch: "Fall 2026",
      source: "https://example.com/list",
      batchCounts: [],
      companies: [1, 2, 3].map((id) => ({
        id,
        slug: `example-${id}`,
        name: `Example ${id}`,
        website: `https://example.com/${id}`,
        batch: "Fall 2026",
        status: "Active",
        oneLiner: "",
        logoUrl: null,
      })),
    });
    const publicPath = join(root, "data/scores/2026-W46.json");
    await writeJson(publicPath, { marker: "Keep reviewed public scores" });
    await assert.rejects(
      scoreSaved({ root, week: "2026-W46" }),
      /Local captures are required/,
    );
    const { readFile } = await import("node:fs/promises");
    assert.deepEqual(JSON.parse(await readFile(publicPath, "utf8")), {
      marker: "Keep reviewed public scores",
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
