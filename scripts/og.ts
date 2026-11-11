// Generates comparison and company share PNGs from the exact saved score inputs.
// Gives static links useful X previews without a server, external images, or LLM calls.
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { crc32 } from "node:zlib";
import satori, { type Font } from "satori";
import { Resvg } from "@resvg/resvg-js";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { siteData, formatDensity, formatPercent } from "../src/site-data.js";
import { projectRoot, writeJson } from "../src/files.js";
import { metadata } from "../src/data.js";
import type { CompanyResult } from "../src/results.js";

const data = await siteData();
const ink = "#24241f";
const paper = "#f8f5ec";
const coral = "#ed6347";
const blue = "#3046cf";
const fonts: Font[] = [];
for (const [name, file, weight] of [
  ["Public Sans", "public-sans/files/public-sans-latin-400-normal.woff", 400],
  ["Public Sans", "public-sans/files/public-sans-latin-700-normal.woff", 700],
  [
    "Barlow Condensed",
    "barlow-condensed/files/barlow-condensed-latin-700-normal.woff",
    700,
  ],
] satisfies [string, string, 400 | 700][]) {
  fonts.push({
    name,
    data: new Uint8Array(
      await readFile(join(projectRoot, `node_modules/@fontsource/${file}`)),
    ).buffer,
    weight,
    style: "normal",
  });
}

function box(style: CSSProperties, children: ReactNode): ReactElement {
  return {
    type: "div",
    key: null,
    props: {
      style: { display: "flex", boxSizing: "border-box", ...style },
      children,
    },
  };
}
const text = (value: string, size: number, style: CSSProperties = {}) =>
  box({ fontSize: size, ...style }, value);
const display = (value: string, size: number, style: CSSProperties = {}) =>
  text(value, size, {
    fontFamily: "Barlow Condensed",
    fontWeight: 700,
    lineHeight: 1,
    ...style,
  });
const frame = (children: ReactNode) =>
  box(
    {
      width: 1200,
      height: 630,
      position: "relative",
      background: paper,
      color: ink,
      fontFamily: "Public Sans",
      flexDirection: "column",
    },
    children,
  );
const header = () =>
  box(
    {
      position: "absolute",
      left: 44,
      top: 28,
      width: 1112,
      height: 42,
      justifyContent: "space-between",
      alignItems: "center",
    },
    [
      box({ alignItems: "center", gap: 11 }, [
        box(
          {
            width: 40,
            height: 40,
            background: coral,
            borderRadius: 100,
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Barlow Condensed",
            fontSize: 30,
          },
          "B",
        ),
        display("BUZZWORD BINGO", 30),
      ]),
      text(
        `${data.config.provisional ? "PROVISIONAL SAMPLE" : "RESULTS"} · ${data.week}`,
        15,
        { border: `1px solid ${ink}`, padding: "8px 12px", borderRadius: 30 },
      ),
    ],
  );
const footer = () =>
  box(
    {
      position: "absolute",
      left: 44,
      top: 581,
      width: 1112,
      height: 28,
      paddingTop: 10,
      borderTop: `1px solid #d8d5c9`,
      justifyContent: "space-between",
      fontSize: 13,
    },
    [
      text("This is satire, made with love.", 13),
      text(
        "Full YC batch vs a systematic public-cloud sample. Homepage text only.",
        13,
      ),
    ],
  );

function comparisonImage(): ReactElement {
  return frame([
    header(),
    display("THE BUZZWORDS HAVE GONE PUBLIC.", 67, {
      position: "absolute",
      left: 44,
      top: 105,
      width: 1112,
    }),
    box(
      {
        position: "absolute",
        left: 44,
        top: 195,
        width: 1112,
        height: 222,
        gap: 18,
      },
      data.cohorts.map((cohort) =>
        box(
          {
            flex: 1,
            minWidth: 0,
            background: cohort.kind === "startups" ? "#fbede4" : "#e8ebfb",
            borderRadius: 14,
            padding: "18px 25px",
            flexDirection: "column",
          },
          [
            text(cohort.label, 18, { fontWeight: 700 }),
            box({ alignItems: "center", gap: 20, marginTop: 8 }, [
              display(formatDensity(cohort.summary.medianDensity), 94, {
                color: cohort.kind === "startups" ? "#b63d27" : blue,
              }),
              text("median density", 16),
            ]),
            text(
              `${formatPercent(cohort.summary.zeroHitPercent)} with zero buzzwords`,
              18,
              { marginTop: 8 },
            ),
            text(
              `${cohort.summary.scored} of ${cohort.summary.selected} homepages scored`,
              14,
              { marginTop: 10, color: "#66665c" },
            ),
          ],
        ),
      ),
    ),
    box(
      {
        position: "absolute",
        left: 44,
        top: 437,
        width: 1112,
        height: 110,
        background: coral,
        padding: "14px 24px",
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "space-between",
      },
      [
        display("“AGENTIC”", 34),
        ...data.agentic.map((phrase) =>
          box({ flexDirection: "column", gap: 5 }, [
            display(`${formatPercent(phrase.sharePercent)}`, 39),
            text(
              `${phrase.companiesHit}/${phrase.scored} ${phrase.label.toLowerCase()} using it`,
              17,
              { fontWeight: 700 },
            ),
            text(`${phrase.hits} raw mentions`, 13),
          ]),
        ),
      ],
    ),
    footer(),
  ]);
}

function companyImage(
  company: CompanyResult,
  kind: "startups" | "incumbents",
): ReactElement {
  const colour = kind === "startups" ? coral : blue;
  const cells =
    company.status === "scored"
      ? company.bingo.cells
      : data.startups.score.card.map((phraseId, index) => ({
          index,
          phraseId,
          hit: phraseId === null,
        }));
  const cardRows = Array.from({ length: 5 }, (_, row) =>
    box(
      { gap: 4, marginTop: row ? 4 : 0 },
      cells.slice(row * 5, row * 5 + 5).map((cell) => {
        const label =
          cell.phraseId === null
            ? "FREE"
            : data.dictionary.find((word) => word.id === cell.phraseId)
                ?.phrase || cell.phraseId;
        return box(
          {
            width: 80,
            height: 68,
            background:
              cell.phraseId === null
                ? ink
                : cell.hit
                  ? kind === "startups"
                    ? "#ffd8b9"
                    : "#cbd3ff"
                  : "#fffdf8",
            color: cell.phraseId === null ? paper : ink,
            borderRadius: 4,
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: 5,
            fontSize: 11,
            fontWeight: 700,
          },
          text(label, label.length > 12 ? 10 : 13, {
            fontFamily: "Barlow Condensed",
            width: 70,
            justifyContent: "center",
            wordBreak: "break-word",
            textAlign: "center",
          }),
        );
      }),
    ),
  );
  return frame([
    header(),
    box(
      {
        position: "absolute",
        left: 44,
        top: 110,
        width: 1112,
        height: 435,
        gap: 32,
        alignItems: "center",
      },
      [
        box({ flexDirection: "column", width: 640 }, [
          display(company.name, company.name.length > 23 ? 61 : 78),
          text(
            kind === "startups"
              ? `YC ${company.batch}`
              : "Public cloud comparison",
            16,
            { color: "#66665c", marginTop: 14 },
          ),
          box({ marginTop: 23, alignItems: "center", gap: 18 }, [
            display(
              company.status === "scored"
                ? formatDensity(company.density, 2)
                : "—",
              108,
              { color: kind === "startups" ? "#b63d27" : blue },
            ),
            text(
              company.status === "scored"
                ? "weighted hits\nper 100 words"
                : "Not scored",
              18,
            ),
          ]),
          text(
            company.status === "scored"
              ? `Best line ${company.bingo.bestLine.hits}/${company.bingo.bestLine.total} · ${company.rawHits} raw phrase hits`
              : "Insufficient or unavailable homepage text",
            19,
            { marginTop: 16, fontWeight: 700 },
          ),
          text(
            "Fixed dictionary. Real homepage text. Same rules for both cohorts.",
            14,
            {
              marginTop: 20,
              color: "#66665c",
            },
          ),
        ]),
        box(
          {
            background: colour,
            borderRadius: 13,
            padding: 11,
            flexDirection: "column",
            width: 440,
            flexShrink: 0,
          },
          [
            box(
              {
                justifyContent: "space-around",
                paddingBottom: 8,
                color: kind === "startups" ? ink : "white",
              },
              ["B", "I", "N", "G", "O"].map((letter) => display(letter, 35)),
            ),
            ...cardRows,
          ],
        ),
      ],
    ),
    footer(),
  ]);
}

const directory = join(projectRoot, "public/og");
await rm(directory, { recursive: true, force: true });
await mkdir(join(directory, "c"), { recursive: true });
async function save(path: string, element: ReactElement) {
  const svg = await satori(element, { width: 1200, height: 630, fonts });
  const png = new Resvg(svg, { font: { loadSystemFonts: false } })
    .render()
    .asPng();
  const description = Buffer.from(
    `Description\0Shows a saved Buzzword Bingo result from saved homepage scores.\nMakes static comparison links shareable without a server or LLM.\nSource: scripts/og.ts; data/scores/${data.week}.json; data/scores/${data.week}/${data.config.comparisonCohort}.json; scoring ${data.scoringVersion}.`,
    "utf8",
  );
  const chunk = Buffer.alloc(description.length + 12);
  chunk.writeUInt32BE(description.length, 0);
  chunk.write("tEXt", 4);
  description.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(chunk.subarray(4, -4)), chunk.length - 4);
  await writeFile(
    join(directory, path),
    Buffer.concat([png.subarray(0, -12), chunk, png.subarray(-12)]),
  );
}
await save("comparison.png", comparisonImage());
for (const { company, cohort } of data.allCompanies)
  await save(`c/${company.slug}.png`, companyImage(company, cohort.kind));
await writeJson(join(directory, "manifest.json"), {
  _meta: metadata(
    "Records the provenance of generated comparison and company share cards.",
    "Makes each raster reproducible from saved scores, local fonts, and the build-time renderer.",
  ),
  renderer: "Satori and resvg",
  source: "scripts/og.ts",
  week: data.week,
  scoringVersion: data.scoringVersion,
  provisional: data.config.provisional,
  fonts: ["Public Sans", "Barlow Condensed"],
  images: [
    "comparison.png",
    ...data.allCompanies.map(({ company }) => `c/${company.slug}.png`),
  ],
});
process.stdout.write(
  `Generated ${data.allCompanies.length + 1} local share PNGs from score JSON. Crawl credits used: 0.\n`,
);
