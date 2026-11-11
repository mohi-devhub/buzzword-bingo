// Checks the generated static site against saved results and real PNG dimensions.
// Catches stale figures, missing company pages, and accidentally public private artifacts.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { exclusionsSchema } from "../src/data.js";
import { normalizeUrl } from "../src/cache.js";
import { scoreFileSchema } from "../src/results.js";
import { readJson, projectRoot } from "../src/files.js";

const root = join(projectRoot, "dist");
const read = (path: string) => readFile(join(root, path), "utf8");
const exported: unknown = JSON.parse(await read("data/score-summary.json"));
assert(
  exported &&
    typeof exported === "object" &&
    "week" in exported &&
    "cohorts" in exported,
);
const publicData = exported as {
  week: string;
  cohorts: {
    summary: { medianDensity: number; zeroHitPercent: number; scored: number };
    companies: { slug: string }[];
  }[];
};
const config = JSON.parse(
  await readFile(join(projectRoot, "data/site.json"), "utf8"),
) as { comparisonCohort: string; OPT_OUT_URL: string };
const exclusions = await readJson(
  join(projectRoot, "data/exclusions.json"),
  exclusionsSchema,
);
const excludedUrls = new Set(exclusions.normalizedUrls.map(normalizeUrl));
const sources = [
  `data/scores/${publicData.week}.json`,
  `data/scores/${publicData.week}/${config.comparisonCohort}.json`,
];
const home = await read("index.html");
let companies = 0;
for (const [index, source] of sources.entries()) {
  const saved = await readJson(join(projectRoot, source), scoreFileSchema);
  saved.companies = saved.companies.filter(
    (company) =>
      !exclusions.companyIds.includes(company.id) &&
      !excludedUrls.has(normalizeUrl(company.website)),
  );
  const scored = saved.companies.filter(
    (company) => company.status === "scored",
  );
  const values = scored.map((company) => company.density).sort((a, b) => a - b);
  const middle = Math.floor(values.length / 2);
  const median =
    values.length % 2
      ? values[middle]!
      : (values[middle - 1]! + values[middle]!) / 2;
  const zero =
    (100 * scored.filter((company) => company.rawHits === 0).length) /
    scored.length;
  const actual = publicData.cohorts[index]!;
  assert.equal(actual.summary.medianDensity, median);
  assert.equal(actual.summary.zeroHitPercent, zero);
  assert.equal(actual.summary.scored, scored.length);
  assert.equal(actual.companies.length, saved.companies.length);
  const kind = index ? "incumbents" : "startups";
  assert.match(
    home,
    new RegExp(
      `data-stat="median-${kind}"[^>]*>\\s*${median.toFixed(3).replace(".", "\\.")}\\s*<`,
    ),
  );
  assert.match(
    home,
    new RegExp(
      `data-stat="zero-${kind}"[^>]*>\\s*${zero.toFixed(1).replace(".", "\\.")}%\\s*<`,
    ),
  );
  const agentic = scored.reduce(
    (total, company) =>
      total +
      (company.phraseCounts.find((phrase) => phrase.id === "agentic")?.count ||
        0),
    0,
  );
  const companiesUsingAgentic = scored.filter((company) =>
    company.phraseCounts.some(
      (phrase) => phrase.id === "agentic" && phrase.count > 0,
    ),
  ).length;
  const agenticPercent = (
    (100 * companiesUsingAgentic) /
    scored.length
  ).toFixed(1);
  assert.match(
    home,
    new RegExp(
      `data-stat="agentic-${kind}"[^>]*>\\s*${agenticPercent.replace(".", "\\.")}%\\s*<`,
    ),
  );
  assert(home.includes(`${companiesUsingAgentic}/${scored.length}`));
  assert.match(
    home,
    new RegExp(
      `data-stat="agentic-mentions-${kind}"[^>]*>\\s*${agentic} raw mentions`,
    ),
  );
  for (const company of saved.companies) {
    const page = await read(`c/${company.slug}/index.html`);
    assert(page.includes(`og/c/${company.slug}.png`));
    assert(page.includes("summary_large_image"));
    assert(page.includes("This is satire, made with love."));
    assert(
      page.includes("Saved homepage result") ||
        page.toLowerCase().includes("provisional"),
    );
    assert(!page.includes("mailto:"));
    if (company.status === "scored")
      assert(page.includes(company.density.toFixed(2)));
    else assert(page.includes("Not scored"));
    const png = await readFile(join(root, `og/c/${company.slug}.png`));
    assert.equal(png.subarray(1, 4).toString(), "PNG");
    assert.equal(png.readUInt32BE(16), 1200);
    assert.equal(png.readUInt32BE(20), 630);
    companies++;
  }
}
assert(
  (await read("opt-out/index.html")).includes(
    config.OPT_OUT_URL.replaceAll("&", "&amp;"),
  ),
);
assert(!(await read("opt-out/index.html")).includes("mailto:"));
assert((await read("about/index.html")).includes("/COMPARISON.md"));
assert.equal(
  await read("COMPARISON.md"),
  await readFile(join(projectRoot, "COMPARISON.md"), "utf8"),
);
for (const entry of await readdir(root, { recursive: true })) {
  assert(
    !/(^|\/)\.env(?:\.|$)|(^|\/)(cache|scrapes|runs)\//.test(entry),
    `Private artifact: ${entry}`,
  );
  if (/\.(html|js|json|css)$/.test(entry)) {
    const content = await read(entry);
    assert(
      !/sk-(?:proj-)?[A-Za-z0-9_-]{30,}/.test(content),
      `Possible credential: ${entry}`,
    );
  }
}
console.log(
  `Static verification passed: ${companies} company pages, matching cohort statistics, opt-out, methodology, PNG sizes, and no private crawl artifacts. Credits used: 0.`,
);
