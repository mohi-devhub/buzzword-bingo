// Runs the budget-limited homepage collector with explicit command-line options.
// Defaults to ten companies and prints cache results and credits for every run.
import { parseArgs } from "node:util";
import { crawl } from "../src/crawl.js";
import { projectRoot } from "../src/files.js";

if (process.env.GITHUB_ACTIONS === "true")
  throw new Error(
    "Crawling and re-scoring are manual local operations; CI builds committed public data only.",
  );

try {
  const { values } = parseArgs({
    options: {
      limit: { type: "string", default: "10" },
      batch: { type: "string" },
      sample: { type: "string" },
      cohort: { type: "string" },
      refresh: { type: "boolean", default: false },
    },
  });
  const run = await crawl({
    root: projectRoot,
    limit: Number(values.limit),
    refresh: values.refresh,
    ...(values.sample ? { sample: values.sample } : {}),
    ...(values.cohort ? { cohort: values.cohort } : {}),
    ...(values.batch ? { batch: values.batch } : {}),
    progress: (event) => process.stdout.write(`${JSON.stringify(event)}\n`),
  });
  if (run.deferred.length > 0) process.exitCode = 2;
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : "Crawl failed."}\n`,
  );
  process.exitCode = 1;
}
