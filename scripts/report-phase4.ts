// Generates the full-batch gate report and three launch drafts from saved scores.
// Keeps every launch number reproducible and refuses partial or over-budget releases.
import { join } from "node:path";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { isoWeek } from "../src/cache.js";
import { creditTotals } from "../src/crawl.js";
import {
  companiesSchema,
  metadata,
  policySchema,
  runSchema,
} from "../src/data.js";
import { jsonFiles, projectRoot, readJson, writeJson } from "../src/files.js";
import { rankCompanies, scoreFileSchema } from "../src/results.js";
import { summarizeCohort } from "../src/comparison.js";

const week = isoWeek(new Date());
const paths = [
  `data/scores/${week}.json`,
  `data/scores/${week}/bvp-established.json`,
];
const [startups, incumbents] = await Promise.all(
  paths.map((path) => readJson(join(projectRoot, path), scoreFileSchema)),
);
if (!startups || !incumbents) throw new Error("Both score files are required.");
const dataset = await readJson(
  join(projectRoot, "data/companies.json"),
  companiesSchema,
);
if (
  startups.companies.length !== dataset.companies.length ||
  startups.companies.some((c) => !c.source)
)
  throw new Error(
    "Full pinned batch must have a saved attempt for every company.",
  );
const runs = await Promise.all(
  (await jsonFiles(join(projectRoot, "data/runs"))).map((path) =>
    readJson(path, runSchema),
  ),
);
const fullRun = runs
  .filter(
    (run) =>
      run.batch === dataset.selectedBatch &&
      run.limit === dataset.companies.length &&
      run.requests.length > 0,
  )
  .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
if (!fullRun?.finishedAt)
  throw new Error("A finished full-batch crawl receipt is required.");
const policy = await readJson(
  join(projectRoot, "data/policy.json"),
  policySchema,
);
const totals = creditTotals(runs, new Date());
if (totals.total > policy.authorizedCredits)
  throw new Error("Cumulative credit cap exceeded.");
const cohorts = [startups, incumbents].map((score) => {
  const summary = summarizeCohort(score.companies);
  const phrase = summary.phrases.find((phrase) => phrase.id === "agentic");
  if (!phrase) throw new Error("Frozen agentic phrase missing.");
  return {
    label: score.batch,
    ...summary,
    agentic: {
      ...phrase,
      sharePercent: summary.scored
        ? (100 * phrase.companiesHit) / summary.scored
        : null,
    },
  };
});
const yc = cohorts[0],
  cloud = cohorts[1];
if (!yc || !cloud || yc.medianDensity === null || cloud.medianDensity === null)
  throw new Error("Scored cohorts required.");
const top = rankCompanies(startups.companies)[0];
if (!top) throw new Error("No scored YC company.");
const pct = (value: number | null) =>
  value === null ? "—" : `${value.toFixed(1)}%`;
const agentic = (cohort: typeof yc) =>
  `${cohort.agentic.companiesHit}/${cohort.scored} (${pct(cohort.agentic.sharePercent)})`;
const newCredits = fullRun.requests.reduce(
  (sum, request) => sum + request.credits.consumed,
  0,
);
const measured = fullRun.requests.every(
  (request) => request.credits.source === "reported",
);
const url = "https://mohi-devhub.github.io/buzzword-bingo/";
const headlineHolds = cloud.medianDensity > yc.medianDensity;
const sourceHashes = await Promise.all(
  paths.map(async (path) => ({
    path,
    sha256: createHash("sha256")
      .update(await readFile(join(projectRoot, path)))
      .digest("hex"),
  })),
);
await writeJson(join(projectRoot, "data/release-results.json"), {
  _meta: metadata(
    "Records the full-batch Phase 4 evidence used for launch drafts.",
    "Ties reported figures and credits to exact score files and the completed crawl.",
  ),
  week,
  scoringVersion: startups.scoringVersion,
  sources: sourceHashes,
  fullRunId: fullRun.id,
  newRequests: fullRun.requests.length,
  cacheHits: fullRun.cacheHits.length,
  newCredits,
  creditBasis: measured
    ? "provider-reported"
    : "includes conservative estimates",
  cumulativeCredits: totals.total,
  approvedCap: policy.authorizedCredits,
  headlineHolds,
  cohorts,
  publicUrl: url,
  deployed: false,
});
const header =
  "<!-- Records the full-batch result and Phase 4 release gate.\nKeeps the evidence reviewable before any public deployment. -->";
const report = `${header}

# Phase 4 gate

The full pinned **YC ${startups.batch}** crawl is complete. No public deployment, push, launch post, or workflow activation was performed.

## Credits and coverage

The estimate before crawling was 195 new credits, plus 80 already used, for 275 cumulative against the approved cap of 300.

The run used **${fullRun.requests.length} new requests**, **${fullRun.cacheHits.length} cached companies**, and **${newCredits} new credits** (${measured ? "provider-reported" : "including conservative estimates"}). Cumulative usage: **${totals.total}/${policy.authorizedCredits} credits**. Remaining authorization: ${policy.authorizedCredits - totals.total} credits. Failures were retained without replacement requests. Run receipt: [${fullRun.id}](data/runs/${fullRun.id}.json).

| Measure | YC ${startups.batch} | Public cloud |
| --- | ---: | ---: |
| Eligible / selected homepages | ${yc.selected} | ${cloud.selected} |
| Scored | ${yc.scored} | ${cloud.scored} |
| Unscored | ${yc.unscored} | ${cloud.unscored} |
| Median density | ${yc.medianDensity.toFixed(3)} | ${cloud.medianDensity.toFixed(3)} |
| Zero dictionary hits | ${yc.zeroHits}/${yc.scored} (${pct(yc.zeroHitPercent)}) | ${cloud.zeroHits}/${cloud.scored} (${pct(cloud.zeroHitPercent)}) |
| Companies using agentic | ${agentic(yc)} | ${agentic(cloud)} |
| Raw agentic mentions, secondary | ${yc.agentic.hits} | ${cloud.agentic.hits} |
| Cohort best line | ${yc.bingo.bestLine.hits}/5 | ${cloud.bingo.bestLine.hits}/5 |

**The sample headline ${headlineHolds ? "still holds" : "does not hold"}:** ${headlineHolds ? "the public-cloud cohort has higher median density" : yc.medianDensity > cloud.medianDensity ? "the full YC cohort has higher median density" : "the two cohort medians are equal"}. The site reports the actual result regardless of direction. This describes captured homepage wording; it is not a product-quality or honesty judgment.

The home and comparison OG lead with the share of scored companies using agentic, including numerator, denominator, and percentage. Repeated mentions remain secondary. The pinned community list may omit unlaunched or unlisted YC companies. The established cohort remains the same systematic sample; [COMPARISON.md](COMPARISON.md) gives the selection and homepage caveats.

## Unscored YC homepages

| Company | Reason | Saved words |
| --- | --- | ---: |
${startups.companies
  .filter((c) => c.status === "unscored")
  .map(
    (c) =>
      `| ${c.name.replaceAll("|", "\\|")} | ${c.reason} | ${c.wordCount ?? "unavailable"} |`,
  )
  .join("\n")}

## Prepared operations

- Full homepage text and markdown live only in the gitignored .local/ store. Public scores contain word counts, source hashes, and only the short evidence displayed on company pages.
- Refreshes and re-scoring run manually and locally. No scheduled crawl workflow remains, and AUTOMATION_ENABLED stays false at launch.
- A combined YC plus public-cloud monthly refresh needs about 275 credits; only 25 remain authorized. No additional scrape spend is approved.
- The static build uses committed data alone; no .local/ store or scrape credentials are needed in GitHub Actions.
- GitHub Pages URL: ${url}. Base path: /buzzword-bingo/. Absolute share links and OG URLs use that origin.
- Public deploy jobs require DEPLOY_ENABLED=true. AUTOMATION_ENABLED remains false and no scheduled crawl workflow exists. Deployment remains disabled; no remote settings were changed.
- optOutRepositoryReady is true as requested. The GitHub issue destination is configured; repository access returned 404 during preparation, so verify public access before release.

## Review artifacts

[README](README.md) explains local use, budget policy, opt-outs, workflow recovery, and release setup. [LAUNCH.md](LAUNCH.md) contains the three generated launch drafts. [data/release-results.json](data/release-results.json) records source hashes and the exact generated figures. [Phase 4 screenshots](artifacts/phase4/) show the final static build.

**Stopped at the Phase 4 gate before deployment.** See artifacts/phase4/verification.json for the checks actually run. To refresh this report and the drafts from new full-batch data, run npm run report:phase4.
`;
await writeFile(join(projectRoot, "PHASE4.md"), report);
const posts = [
  [
    `The bingo hall is open.\n\n${top.name} leads our YC ${startups.batch} board: ${top.density.toFixed(2)} weighted buzzword hits per 100 words.\n\n${yc.scored} scored homepages. ${startups.dictionary.length} frozen phrases. Naturally, the bingo hall has a B2B pipeline.\n\nSatire, made with love.\n${url}`,
  ],
  [
    `The “honest ones” 🏆\n\n${yc.zeroHits}/${yc.scored} scored YC ${startups.batch} homepages had zero dictionary hits (${pct(yc.zeroHitPercent)}). Public cloud: ${cloud.zeroHits}/${cloud.scored} (${pct(cloud.zeroHitPercent)}).\n\nA playful label, not proof of honesty. Just the words we counted.\n${url}`,
  ],
  [
    `How Buzzword Bingo works:\n\nWe attempted all ${yc.selected} eligible YC ${startups.batch} homepages in a pinned community list: ${yc.scored} scored, ${yc.unscored} unscored. We compared them with ${cloud.selected} systematically selected public-cloud companies (${cloud.scored} scored). No replacement pages.`,
    `${startups.dictionary.length} frozen phrases. Weights ${Math.min(...startups.dictionary.map((p) => p.weight))}–${Math.max(...startups.dictionary.map((p) => p.weight))}.\n\nDensity = weighted phrase hits / homepage words × 100. No LLM in the score. Explicit variants and word boundaries; longest overlaps win. Only saved public homepage text.`,
    `Real example: ${top.name} has ${top.weightedHits} weighted hits across ${top.wordCount} homepage words, giving ${top.density.toFixed(2)} per 100.\n\nCounts describe wording, not whether the product is good or its claims are true.`,
    `Median density: YC ${yc.medianDensity.toFixed(3)}; public cloud ${cloud.medianDensity.toFixed(3)}.\n\n“Agentic” appears on ${agentic(yc)} YC pages vs ${agentic(cloud)} public-cloud pages. Raw mentions: ${yc.agentic.hits} vs ${cloud.agentic.hits}. Company share comes first because cohort sizes differ.`,
    `The YC list may miss unlaunched companies. The public-cloud group is a systematic sample, not every incumbent. Extraction and page length can affect counts.\n\nDictionary, source rules, bingo cards, and company opt-out:\n${url}about/\n\nThis is satire, made with love.`,
  ],
];
for (const draft of posts)
  for (const post of draft) {
    // URL shortening is counted conservatively; UTF-16 counts emoji at least as heavily as X.
    const length = post.replace(/https?:\/\/\S+/g, "x".repeat(23)).length;
    if (length > 280)
      throw new Error(`Launch post exceeds 280 characters: ${length}`);
  }
await writeFile(
  join(projectRoot, "LAUNCH.md"),
  `<!-- Drafts three launch angles from the full-batch score JSON.\nKeeps every number auditable and leaves publication behind the release gate. -->\n\n# Launch drafts\n\nNot posted. Generated for ${week}; source hashes and crawl receipt are in data/release-results.json. All figures use the full pinned YC batch, not the tuning sample.\n\n${posts
    .map(
      (draft, index) =>
        `## ${["Funny leaderboard reveal", "The honest ones", "Methodology thread"][index]}\n\n${draft
          .map(
            (post, part) =>
              `${draft.length > 1 ? `Post ${part + 1}\n\n` : ""}${post
                .split("\n")
                .map((line) => (line ? `> ${line}` : ">"))
                .join("\n")}`,
          )
          .join("\n\n")}`,
    )
    .join("\n\n")}\n`,
);
process.stdout.write(
  `Generated PHASE4.md, LAUNCH.md, and release-results.json from full-batch scores. Credits used: 0.\n`,
);
