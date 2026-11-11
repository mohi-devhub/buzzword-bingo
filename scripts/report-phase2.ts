// Generates the tuning report from saved scores, sample positions, and credit receipts.
// Exposes rankings, phrase coverage, real excerpts, and bingo rates for dictionary review.
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { z } from "zod";
import { isoWeek } from "../src/cache.js";
import { runSchema, sampleSchema, type Run } from "../src/data.js";
import { isMissing, jsonFiles, projectRoot, readJson } from "../src/files.js";
import { highlightedHtml, escapeHtml } from "../src/highlight.js";
import {
  rankCompanies,
  scoreFileSchema,
  type ScoredCompany,
} from "../src/results.js";
import { comparisonFileSchema, type Comparison } from "../src/comparison.js";
import { comparisonMarkdown } from "../src/comparison-report.js";

const { values } = parseArgs({
  options: { week: { type: "string", default: isoWeek(new Date()) } },
});
const week = z
  .string()
  .regex(/^\d{4}-W\d{2}$/)
  .parse(values.week);
const scores = await readJson(
  join(projectRoot, `data/scores/${week}.json`),
  scoreFileSchema,
);
let comparison: Comparison | undefined;
try {
  comparison = await readJson(
    join(projectRoot, `data/comparisons/${week}.json`),
    comparisonFileSchema,
  );
} catch (error) {
  if (!isMissing(error)) throw error;
}
const sample = await readJson(
  join(projectRoot, `data/samples/${scores.sample}.json`),
  sampleSchema,
);
const most = rankCompanies(scores.companies);
const least = rankCompanies(scores.companies, "least");
const unscored = scores.companies.filter(
  (company) => company.status === "unscored",
);
const bingoCount = most.filter((company) => company.bingo.hasBingo).length;
const percent = (count: number, total: number) =>
  total === 0 ? "N/A" : `${((100 * count) / total).toFixed(1)}%`;
const counts = (company: ScoredCompany) =>
  company.phraseCounts
    .filter((phrase) => phrase.count > 0)
    .map((phrase) => `${phrase.phrase} ×${phrase.count}`)
    .join("; ") || "None";
const cell = (value: string) => escapeHtml(value).replaceAll("|", "\\|");
const link = (company: ScoredCompany) =>
  `[${cell(company.name)}](${company.website})`;
const frequencies = scores.dictionary
  .map((word, dictionaryIndex) => {
    const values = most.map(
      (company) =>
        company.phraseCounts.find((phrase) => phrase.id === word.id)?.count ??
        0,
    );
    return {
      ...word,
      dictionaryIndex,
      hits: values.reduce((sum, count) => sum + count, 0),
      companies: values.filter((count) => count > 0).length,
    };
  })
  .sort(
    (a, b) =>
      b.hits - a.hits ||
      b.companies - a.companies ||
      a.dictionaryIndex - b.dictionaryIndex,
  );
const runs: Run[] = [];
for (const path of await jsonFiles(join(projectRoot, "data/runs")))
  runs.push(await readJson(path, runSchema));
runs.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
const expandedRuns = runs.filter(
  (run) =>
    run.selectedSlugs.length === sample.companies.length &&
    sample.companies.every((company) =>
      run.selectedSlugs.includes(company.slug),
    ),
);
const credits = (entries: typeof runs) =>
  entries
    .flatMap((run) => run.requests)
    .reduce((sum, request) => sum + request.credits.consumed, 0);
const positions = sample.companies
  .filter((company) => company.cohort === "expansion")
  .map((company) => company.position);
const snippets: string[] = [];
for (const company of most.slice(0, 2)) {
  if (!company.source) continue;
  const snippet = company.excerpts[0];
  if (!snippet) continue;
  const markdown = highlightedHtml(snippet.text, snippet.matches)
    .replaceAll("<mark>", "**")
    .replaceAll("</mark>", "**")
    .replace(/\s+/g, " ");
  snippets.push(
    `### ${cell(company.name)}`,
    "",
    `> ${snippet.prefix}${markdown}${snippet.suffix}`,
    "",
    `[Public homepage](${company.website}). This is the same short evidence displayed on the company page.`,
    "",
  );
}
const report = [
  "<!-- Reports Phase 2 results for the frozen YC and established-company cohorts.",
  "Makes density comparisons, bingo coverage, and credit spend reviewable before Phase 3. -->",
  "",
  "# Phase 2 tuning review",
  "",
  `Week **${week}**, batch **${scores.batch}**, scoring version \`${scores.scoringVersion}\`.`,
  `**${scores.companies.length} selected, ${most.length} scored, ${unscored.length} unscored.**`,
  `The approved dictionary and weights are unchanged. Company bingo is presented as **best line X/5**, and cohort-wide cards show company counts per phrase. Historical individual BINGO incidence for YC remains ${bingoCount}/${most.length}, ${percent(bingoCount, most.length)}; no card or scoring rules were tuned toward funnier results.`,
  "",
  ...(comparison ? comparisonMarkdown(comparison) : []),
  "",
  "## Sample and credits",
  "",
  "Keep the original ten. A strict every-eighth sweep of the 225-company list has 27 additional candidates. To respect thirty total companies and twenty new requests, select twenty evenly across those candidates. Positions below are one-based; the grid uses zero-based indices divisible by eight.",
  "",
  `Added positions: ${positions.join(", ")}.`,
  "",
  `[Pinned sample and cohort membership](data/samples/${scores.sample}.json). This is a deterministic tuning sample with extra weight on the original A-heavy cohort, not a random estimate of the whole batch.`,
  "",
  `**YC expansion credits: ${credits(expandedRuns)}. Comparison-cohort credits: ${credits(runs.filter((run) => run.selectedSlugs.some((slug) => slug.startsWith("bvp-"))))}. Project total credits: ${credits(runs)}.** The original ten were cache hits. Report generation and scoring use no scrape or LLM credits.`,
  "",
  "| Expansion run | New requests | Cache hits | Credits used |",
  "| --- | ---: | ---: | ---: |",
  ...expandedRuns.map(
    (run) =>
      `| [${run.id}](data/runs/${run.id}.json) | ${run.requests.length} | ${run.cacheHits.length} | ${credits([run])} |`,
  ),
  "",
  "## Top ten by density",
  "",
  "Density is weighted hits per 100 homepage words. Counts below are raw accepted occurrences, including repeats. All fifty phrase counts, including zeros, and category contributions are in the score JSON.",
  "",
  "| Rank | Company | Density | Best line | Words | Weighted hits | Per-phrase counts |",
  "| ---: | --- | ---: | ---: | ---: | ---: | --- |",
  ...most
    .slice(0, 10)
    .map(
      (company, index) =>
        `| ${index + 1} | ${link(company)} | ${company.density.toFixed(2)} | ${company.bingo.bestLine.hits}/5 | ${company.wordCount} | ${company.weightedHits} | ${cell(counts(company))} |`,
    ),
  "",
  "## Bottom five, the honest ones",
  "",
  "The label is satire about wording, not a claim about honesty or product quality. Zero-score ties use stable slug order. Unscored pages are excluded.",
  "",
  "| Company | Density | Words | Per-phrase counts |",
  "| --- | ---: | ---: | --- |",
  ...least
    .slice(0, 5)
    .map(
      (company) =>
        `| ${link(company)} | ${company.density.toFixed(2)} | ${company.wordCount} | ${cell(counts(company))} |`,
    ),
  "",
  `${most.filter((company) => company.rawHits === 0).length} of ${most.length} scored companies have no dictionary hits; the table shows the first five by slug.`,
  "",
  "## Ten most-hit phrases",
  "",
  `Sort by total accepted occurrences, then company coverage, then dictionary order. Coverage uses the ${most.length} scored pages, not the failed or insufficient pages. Raw counts can be driven by one long or repetitive homepage, so both columns matter.`,
  "",
  "| Phrase | Weight | Total occurrences | Companies hit | Coverage |",
  "| --- | ---: | ---: | ---: | ---: |",
  ...frequencies
    .slice(0, 10)
    .map(
      (phrase) =>
        `| ${phrase.phrase} | ${phrase.weight} | ${phrase.hits} | ${phrase.companies} | ${percent(phrase.companies, most.length)} |`,
    ),
  "",
  "No weights were adjusted after this measurement. Generic AI and generic agent remain excluded. Longer accepted phrases take precedence, so agentic workflow does not also count as agentic at the same position. Phrase presence describes the words used, not whether a technical claim is justified.",
  "",
  "## Two real highlighted excerpts",
  "",
  ...snippets,
  "## Unscored companies",
  "",
  ...(unscored.length
    ? unscored.map(
        (company) =>
          `- ${cell(company.name)}: ${company.reason}, ${company.wordCount ?? "unknown"} words. It contributes neither a zero score nor a ranking position.`,
      )
    : ["None."]),
  "",
  "## Rules and reproducibility",
  "",
  "- Formula: `100 * weightedHits / wordCount`. Keep full precision for ranking and show two decimals.",
  "- Match explicit case-insensitive variants at Unicode word boundaries. Spaces and common hyphens can separate phrase words. Resolve overlaps by longest span, then dictionary order.",
  "- Score only saved visible homepage text. Titles, descriptions, directory text, and LLM output are excluded.",
  "- Store exact text spans, per-phrase counts, category totals, cell hits, completed lines, source paths, and source text hashes.",
  "- Use the same fixed card for every company, with a free centre and twelve possible complete lines.",
  "",
  `The complete score file is [data/scores/${week}.json](data/scores/${week}.json). Its embedded dictionary and card plus source text hashes identify the inputs. Repeated scoring with the same \`--week\` produces identical JSON.`,
  "",
  "Reproduce with:",
  "",
  "```sh",
  "npm run crawl -- --sample fall-2026-tuning --limit 30",
  "npm run crawl -- --cohort bvp-established --limit 50",
  `npm run score -- --week ${week}`,
  `npm run score -- --cohort bvp-established --week ${week}`,
  `npm run compare -- --week ${week}`,
  `npm run report:phase2 -- --week ${week}`,
  "npm run check",
  "npm test",
  "```",
  "",
  "The repeated crawls use the local cache. The approved comparison adds fifty requests, for eighty lifetime requests and credits including the thirty YC captures. After the completed fifty-company comparison crawl, no further captures are authorized.",
  "",
  "**This is satire, made with love.** Only companies are ranked. The Phase 2 gate is ready for dictionary review; site work, AI extras, a full-batch run, cron, and deployment have not started.",
  "",
].join("\n");
await writeFile(join(projectRoot, "PHASE2.md"), report);
process.stdout.write(
  "Wrote PHASE2.md from saved scores and receipts. Credits used: 0.\n",
);
