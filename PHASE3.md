<!-- Records the static sample website and its Phase 3 review evidence.
Keeps the provisional results, validation, and remaining deployment gate explicit. -->

# Phase 3 gate

The comparison-first Astro site is built from the approved saved sample. No homepage requests or LLM calls were made. **Phase 3 credits used: 0; cumulative provider-reported crawl credits: 80.** The scoring dictionary, weights, matching, card, and existing data are unchanged.

All displayed results are labelled provisional. The full YC batch crawl in Phase 4 will recompute them. Neither deployment nor Phase 4 automation has been added.

## What to review

Home leads with median density, zero-hit percentage, scored coverage, and the agentic comparison. These figures are computed from the two score JSON files at build time, including the direction of the comparison sentence. Tabs offer both cohorts, most/least ordering, and category densities. Only scored companies enter rankings, with up to 25 visible rows. Both cohort bingo cards show distinct-company counts.

Company pages include best-line progress, phrase and category counts, real highlighted matches, two short saved-text excerpts where available, source links, actual saved history, and a prefilled X post. The single-week history explicitly says that further observations are not available. Unscored pages explain why they have no score.

The Play page supports clicks, keyboard activation, completed-line detection, reset, and local persistence. About publishes the full dictionary, formula, matching rules, cohort selection, homepage-only limitations, satire note, and the [comparison source note](COMPARISON.md). The build generates a comparison share card and a card for each company using Satori, resvg, and local fonts. It makes no scrape requests.

| Provisional measure | YC Fall 2026 sample | Public cloud sample |
| --- | ---: | ---: |
| Selected homepages | 30 | 50 |
| Scored homepages | 29 | 49 |
| Median weighted hits per 100 words | 0.136 | 1.565 |
| Zero-buzzword homepages | 12 / 29 (41.4%) | 0 / 49 (0.0%) |
| Raw agentic mentions | 3 | 124 |
| Homepages using agentic | 3 / 29 | 28 / 49 |

The raw agentic totals are not normalized; the site states that cohort sizes differ. Zero-hit percentages and medians use scored pages only. The machine-readable public export at `dist/data/score-summary.json` contains the same provisional results without crawl request receipts or credentials.

## Screenshots

Captured from the built static site in isolated Chrome 156. Desktop viewport: 1440 × 1000; mobile: 390 × 844. The four page captures show the full document. The fifth isolates the comparison section.

| Page | Desktop | Mobile |
| --- | --- | --- |
| Home | [Screenshot](artifacts/phase3/home-desktop.png) | [Screenshot](artifacts/phase3/home-mobile.png) |
| Adalat AI | [Screenshot](artifacts/phase3/company-desktop.png) | [Screenshot](artifacts/phase3/company-mobile.png) |

[Comparison section](artifacts/phase3/comparison-desktop.png) · [Comparison OG card](artifacts/phase3/og-comparison.png) · [Company OG card](artifacts/phase3/og-company.png)

[Browser evidence and capture provenance](artifacts/phase3/verification.json) records all 20 passed checks. The share-image provenance is generated at `public/og/manifest.json` on each build.

## Validation

- `npm run check`: zero TypeScript or Astro errors, warnings, or hints.
- `npm test`: all 33 existing tests pass, including variants, boundaries, density, bingo, caching, credit limits, cohort comparison, and exclusions.
- `npm run build`: 84 static HTML pages, one public JSON route, and 81 PNG share cards.
- `npm run verify:site`: all 80 company routes, independent median/zero/agentic arithmetic, matching displayed figures, share metadata, PNG dimensions, methodology, opt-out destination, and absence of private crawl artifacts pass.
- Real browser: cohort tabs, exact most/least order, accessible sort direction, category filter, playable BINGO, persistence/reset, source highlights, X link/metadata, unscored history, methodology, and opt-out checks pass. Both mobile pages fit their viewport without horizontal overflow.
- `npm audit --audit-level=moderate`: zero vulnerabilities.

The independent visual reviewer returned **ship** after scoring all three requested fixes resolved. The [review record](artifacts/phase3/design-review.md) preserves the scope of that verdict. [DESIGN.md](DESIGN.md) and `.impeccable/design.json` record the implemented visual system.

## Local preview and configuration

```sh
npm ci
npm run build
npm run preview -- --port 4321
```

Open `http://127.0.0.1:4321/`. npm scripts use the project-local Node 22.23.4 binary. The Astro version and runtime rationale are in [PLAN.md](PLAN.md).

`data/site.json` configures the comparison cohort, provisional status, and `OPT_OUT_URL`. The approved destination is `https://github.com/mohi-devhub/buzzword-bingo/issues/new?template=company-opt-out.yml`. `optOutRepositoryReady: false` keeps the pending-repository notice visible. A company-only GitHub issue template and downloadable local request template are included. There is no email address on the site.

The owner will create the public repository before deployment. `BINGO_SITE_URL` and `BINGO_BASE` configure the future public sharing origin and optional GitHub Pages prefix; this local gate deliberately uses localhost. Generated `dist/`, PNG cards, font licences, and copied methodology are rebuilt from source rather than committed. The seven review PNGs and their provenance are committed as gate evidence.

**Stopped at Phase 3.** The full batch, monthly/weekly refresh workflow, deployment setup, README, and launch posts remain behind Phase 4 approval. The optional AI feature remains disabled.
