// Renders cohort statistics, company-count bingo cards, and line progress as Markdown.
// Makes the comparison reviewable before any Phase 3 interface is built.
import { buzzwords } from "./buzzwords.js";
import type { Comparison } from "./comparison.js";
import { escapeHtml } from "./highlight.js";

const cell = (value: string) => escapeHtml(value).replaceAll("|", "\\|");
const density = (value: number | null) =>
  value === null ? "N/A" : value.toFixed(3);
const percent = (value: number | null) =>
  value === null ? "N/A" : `${value.toFixed(1)}%`;

export function comparisonMarkdown(comparison: Comparison): string[] {
  const output = [
    "## Cohort comparison",
    "",
    "The dictionary, weights, matching, formula, minimum text length, and fixed card are identical for both cohorts. The comparison source and systematic selection were frozen before crawling. See [the source note](COMPARISON.md). No results-driven tuning or company replacement was performed.",
    "",
    "| Cohort | Selected | Scored | Unscored | Median density | Zero-hit companies | Zero-hit percentage |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...comparison.cohorts.map(
      (cohort) =>
        `| ${cell(cohort.label)} | ${cohort.selected} | ${cohort.scored} | ${cohort.unscored} | ${density(cohort.medianDensity)} | ${cohort.zeroHits}/${cohort.scored} | ${percent(cohort.zeroHitPercent)} |`,
    ),
    "",
    "Density means weighted hits per 100 words. The median gives each company equal weight. Zero-hit percentages use valid scored pages as the denominator; unscored pages never count as zero. These are descriptive differences between selected homepage cohorts, not a causal claim about company age or YC membership.",
    "",
    "## Top phrases by cohort",
    "",
    "Order by total accepted occurrences, then company coverage, then dictionary order. Company coverage distinguishes repeated wording on one page from a widespread phrase.",
    "",
  ];
  for (const cohort of comparison.cohorts) {
    output.push(
      `### ${cell(cohort.label)}`,
      "",
      "| Phrase | Weight | Occurrences | Companies hit |",
      "| --- | ---: | ---: | ---: |",
      ...cohort.phrases
        .filter((phrase) => phrase.hits > 0)
        .slice(0, 10)
        .map(
          (phrase) =>
            `| ${phrase.phrase} | ${phrase.weight} | ${phrase.hits} | ${phrase.companiesHit}/${cohort.scored} |`,
        ),
      "",
    );
  }
  output.push(
    "## Cohort-wide bingo cards",
    "",
    "A phrase cell is hit if any valid scored company used it. Each label counts distinct companies, even if a page repeats the phrase many times. Bold cells are hit. FREE is automatic and has no company count. This uses the approved fixed card without changing its phrases.",
    "",
  );
  for (const cohort of comparison.cohorts) {
    output.push(
      `### ${cell(cohort.label)}`,
      "",
      `Cohort best line: **${cohort.bingo.bestLine.hits}/5**. Completed lines: ${cohort.bingo.completedLines.join(", ") || "none"}.`,
      "",
      "| B | I | N | G | O |",
      "| --- | --- | --- | --- | --- |",
    );
    for (let row = 0; row < 5; row++) {
      const cells = cohort.bingo.cells
        .slice(row * 5, row * 5 + 5)
        .map((entry) => {
          if (entry.phraseId === null) return "**FREE**";
          const phrase =
            buzzwords.find((word) => word.id === entry.phraseId)?.phrase ??
            entry.phraseId;
          const label = `${phrase} (${entry.companiesHit}/${cohort.scored})`;
          return entry.hit ? `**${label}**` : label;
        });
      output.push(`| ${cells.join(" | ")} |`);
    }
    output.push("");
  }
  output.push(
    "## Per-company best line",
    "",
    "Best line is the highest number of marked cells in any of the twelve rows, columns, or diagonals, including FREE. A zero-buzzword page therefore starts at 1/5 on a line through FREE. All tied best lines and all cell states are stored in the score files. Individual BINGO remains derivable, but line progress is the company-level presentation.",
    "",
  );
  for (const cohort of comparison.cohorts) {
    output.push(
      `### ${cell(cohort.label)}`,
      "",
      "| Company | Best line | Density |",
      "| --- | ---: | ---: |",
    );
    const progress = [...cohort.companyProgress].sort((a, b) => {
      if (a.status !== b.status) return a.status === "scored" ? -1 : 1;
      if (a.status === "scored" && b.status === "scored")
        return (
          b.bestLine.hits - a.bestLine.hits ||
          b.density - a.density ||
          a.slug.localeCompare(b.slug)
        );
      return a.slug.localeCompare(b.slug);
    });
    for (const company of progress) {
      if (company.status === "scored") {
        const name = cell(company.name);
        output.push(
          `| ${name} | ${company.bestLine.hits}/5 | ${company.density.toFixed(2)} |`,
        );
      } else
        output.push(
          `| ${cell(company.name)} | Unscored: ${cell(company.reason)} | N/A |`,
        );
    }
    output.push("");
  }
  output.push(
    `[Full comparison data](data/comparisons/${comparison.week}.json) includes exact statistics, all phrase frequencies, both cohort cards, and every company's best line.`,
    "",
  );
  return output;
}
