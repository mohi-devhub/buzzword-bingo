// Defines public scores and the exact short evidence shown on company pages.
// Keeps full captures and whole-page match lists out of committed scoring data.
import { createHash } from "node:crypto";
import { z } from "zod";
import { buzzwordSchema, categorySchema } from "./buzzwords.js";
import {
  companySchema,
  metaSchema,
  type Company,
  type Scrape,
} from "./data.js";
import { formula, scoreText } from "./score.js";
import { excerpt } from "./highlight.js";

const nonnegative = z.number().int().nonnegative();
const matchSchema = z
  .object({
    phraseId: z.string(),
    dictionaryIndex: nonnegative,
    start: nonnegative,
    end: nonnegative,
    text: z.string().max(160),
  })
  .strict();
export const excerptSchema = z
  .object({
    phrase: z.string(),
    text: z.string().max(1200),
    matches: z.array(matchSchema).max(24),
    prefix: z.enum(["", "… "]),
    suffix: z.enum(["", " …"]),
  })
  .strict()
  .refine(
    (value) => value.text.trim().split(/\s+/u).length <= 12,
    "Publish at most twelve words per displayed excerpt.",
  );
const sourceSchema = z
  .object({
    week: z.string(),
    attemptedAt: z.iso.datetime(),
    textHash: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
const baseSchema = companySchema
  .pick({ id: true, slug: true, name: true, batch: true, website: true })
  .extend({ source: sourceSchema.nullable() })
  .strict();
export const phraseCountSchema = buzzwordSchema
  .omit({ variants: true })
  .extend({ count: nonnegative, weightedHits: nonnegative });
export const bestLineSchema = z.object({
  hits: nonnegative.max(5),
  total: z.literal(5),
  lineIds: z.array(z.string()),
});
export const bingoResultSchema = z.object({
  cells: z
    .array(
      z.object({
        index: nonnegative,
        phraseId: z.string().nullable(),
        hit: z.boolean(),
      }),
    )
    .length(25),
  completedLines: z.array(z.string()),
  hasBingo: z.boolean(),
  lineProgress: z
    .array(
      z.object({
        lineId: z.string(),
        hits: nonnegative.max(5),
        total: z.literal(5),
      }),
    )
    .length(12),
  bestLine: bestLineSchema,
});
const scoredSchema = baseSchema.extend({
  status: z.literal("scored"),
  wordCount: z.number().int().min(50),
  rawHits: nonnegative,
  weightedHits: nonnegative,
  density: z.number().nonnegative(),
  phraseCounts: z.array(phraseCountSchema),
  categoryScores: z.array(
    z.object({
      category: categorySchema,
      rawHits: nonnegative,
      weightedHits: nonnegative,
      density: z.number().nonnegative(),
    }),
  ),
  phraseEvidence: z
    .array(
      z.object({ phraseId: z.string(), text: z.string().max(160) }).strict(),
    )
    .max(50),
  excerpts: z.array(excerptSchema).max(2),
  bingo: bingoResultSchema,
});
export const companyResultSchema = z.discriminatedUnion("status", [
  scoredSchema,
  baseSchema.extend({
    status: z.literal("unscored"),
    reason: z.string(),
    wordCount: nonnegative.nullable(),
  }),
]);
export type CompanyResult = z.infer<typeof companyResultSchema>;
export type ScoredCompany = z.infer<typeof scoredSchema>;

export function scoreCompany(
  company: Company,
  capture?: { record: Scrape },
): CompanyResult {
  const { id, slug, name, batch, website } = company;
  const base = {
    id,
    slug,
    name,
    batch,
    website,
    source: capture
      ? {
          week: capture.record.week,
          attemptedAt: capture.record.attemptedAt,
          textHash: createHash("sha256")
            .update(
              capture.record.result.status === "pending"
                ? ""
                : capture.record.result.text,
            )
            .digest("hex"),
        }
      : null,
  };
  if (!capture)
    return {
      ...base,
      status: "unscored",
      reason: "not_scraped",
      wordCount: null,
    };
  const result = capture.record.result;
  if (result.status !== "scraped")
    return {
      ...base,
      status: "unscored",
      reason: result.reason,
      wordCount: result.status === "pending" ? null : result.wordCount,
    };
  const analyzed = scoreText(result.text);
  if (analyzed.wordCount !== result.wordCount)
    throw new Error(
      `Stored word count differs from scoring tokens for ${slug}.`,
    );
  if (analyzed.status === "unscored") return { ...base, ...analyzed };
  const { normalizedText, matches, ...score } = analyzed;
  if (normalizedText !== result.text)
    throw new Error(
      `Saved text is not normalized for ${slug}; extraction needs review.`,
    );
  const seen = new Set<string>();
  const firstMatches = matches.filter((match) => {
    if (seen.has(match.phraseId)) return false;
    seen.add(match.phraseId);
    return true;
  });
  const phraseEvidence = firstMatches.map(({ phraseId, text }) => ({
    phraseId,
    text,
  }));
  const excerpts = firstMatches.slice(0, 2).map((anchor) => {
    const {
      text,
      matches: localMatches,
      prefix,
      suffix,
    } = excerpt(normalizedText, matches, anchor, 12);
    return {
      phrase:
        score.phraseCounts.find((phrase) => phrase.id === anchor.phraseId)
          ?.phrase ?? anchor.phraseId,
      text,
      matches: localMatches,
      prefix,
      suffix,
    };
  });
  return companyResultSchema.parse({
    ...base,
    ...score,
    phraseEvidence,
    excerpts,
  });
}

export function rankCompanies(
  results: CompanyResult[],
  direction: "most" | "least" = "most",
): ScoredCompany[] {
  return results
    .filter((company) => company.status === "scored")
    .sort(
      (a, b) =>
        (direction === "most"
          ? b.density - a.density
          : a.density - b.density) ||
        (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : a.id - b.id),
    );
}

export const scoreFileSchema = z
  .object({
    _meta: metaSchema,
    week: z.string().regex(/^\d{4}-W\d{2}$/),
    sample: z.string(),
    batch: z.string(),
    sourceFetchedAt: z.iso.datetime(),
    scoringVersion: z.string().regex(/^v1-[a-f0-9]{12}$/),
    formula: z.literal(formula),
    dictionary: z.array(buzzwordSchema),
    card: z.array(z.string().nullable()).length(25),
    companies: z.array(companyResultSchema),
  })
  .strict();
