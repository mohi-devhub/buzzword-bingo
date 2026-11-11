// Checks that the public Git snapshot contains only approved scores and short evidence.
// Blocks accidental capture publication or reintroduction of a crawling workflow.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { scoreFileSchema } from "../src/results.js";
import { jsonFiles, projectRoot, readJson } from "../src/files.js";

const tracked = execFileSync("git", ["ls-files", "-z"], {
  cwd: projectRoot,
  encoding: "utf8",
})
  .split("\0")
  .filter(Boolean);
assert(
  !tracked.some((path) => /^(?:\.local|data\/(?:scrapes|cache))\//.test(path)),
  "Private capture paths are tracked.",
);
const history = execFileSync("git", ["rev-list", "--objects", "--all"], {
  cwd: projectRoot,
  encoding: "utf8",
  maxBuffer: 20_000_000,
});
assert(
  !history
    .split("\n")
    .some((line) =>
      /^[a-f0-9]+ (?:\.local|data\/(?:scrapes|cache))(?:\/|$)/.test(line),
    ),
  "Private capture paths remain reachable in Git history.",
);
for (const file of await jsonFiles(join(projectRoot, "data/scores")))
  await readJson(file, scoreFileSchema);
for (const file of await jsonFiles(join(projectRoot, "data"))) {
  const value: unknown = JSON.parse(await readFile(file, "utf8"));
  const visit = (item: unknown, path = "") => {
    if (!item || typeof item !== "object") return;
    for (const [key, child] of Object.entries(item)) {
      assert(
        !["markdown", "normalizedText", "html"].includes(key),
        `Private payload field in ${file}`,
      );
      if (key === "text")
        assert(
          /(?:excerpts|phraseEvidence)\./.test(path),
          `Unapproved text field in ${file}`,
        );
      visit(child, `${path}${key}.`);
    }
  };
  visit(value);
}
for (const name of await readdir(join(projectRoot, ".github/workflows"))) {
  if (!/\.ya?ml$/.test(name)) continue;
  const workflow = await readFile(
    join(projectRoot, ".github/workflows", name),
    "utf8",
  );
  assert(
    !/\bschedule\s*:|CONTEXT_DEV_API_KEY|npm run (?:refresh|crawl|score)\b/.test(
      workflow,
    ),
    "Crawling/re-scoring automation must remain disabled.",
  );
}
process.stdout.write(
  "Public snapshot verified: no full captures, only bounded displayed evidence, and no crawl automation. Credits used: 0.\n",
);
