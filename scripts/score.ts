// Scores the full pinned YC batch or an explicit sample or comparison cohort.
// Reuses saved captures without reading keys or making network requests.
import { parseArgs } from "node:util";
import { z } from "zod";
import { isoWeek } from "../src/cache.js";
import { slugSchema } from "../src/data.js";
import { projectRoot } from "../src/files.js";
import { scoreSaved } from "../src/scoring-run.js";

if (process.env.GITHUB_ACTIONS === "true")
  throw new Error(
    "Crawling and re-scoring are manual local operations; CI builds committed public data only.",
  );

const { values } = parseArgs({
  options: {
    sample: { type: "string" },
    cohort: { type: "string" },
    week: { type: "string", default: isoWeek(new Date()) },
  },
});
const output = await scoreSaved({
  root: projectRoot,
  week: z
    .string()
    .regex(/^\d{4}-W\d{2}$/)
    .parse(values.week),
  ...(values.cohort ? { cohort: slugSchema.parse(values.cohort) } : {}),
  ...(values.sample ? { sample: slugSchema.parse(values.sample) } : {}),
});
process.stdout.write(
  `${JSON.stringify({
    week: output.week,
    selected: output.companies.length,
    scored: output.companies.filter((company) => company.status === "scored")
      .length,
    unscored: output.companies.filter(
      (company) => company.status === "unscored",
    ).length,
    scoringVersion: output.scoringVersion,
    creditsUsed: 0,
  })}\n`,
);
