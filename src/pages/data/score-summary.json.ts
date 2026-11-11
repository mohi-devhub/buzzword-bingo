// Exports only public scoring results and comparison inputs as a static JSON file.
// Makes the visible figures auditable without publishing request receipts or credentials.
import { siteData } from "../../site-data.js";
import { metadata } from "../../data.js";

export async function GET() {
  const data = await siteData();
  const body = {
    _meta: metadata(
      "Exports the saved Buzzword Bingo results used by the static site.",
      "Allows readers to verify headline numbers and company counts from the same saved scores.",
    ),
    provisional: data.config.provisional,
    week: data.week,
    scoringVersion: data.scoringVersion,
    formula: data.formula,
    dictionary: data.dictionary,
    cohorts: data.cohorts.map((cohort) => ({
      id: cohort.score.sample,
      label: cohort.label,
      summary: cohort.summary,
      companies: cohort.score.companies,
    })),
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
}
