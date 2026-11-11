<!-- Reports Phase 2 results for the frozen YC and established-company cohorts.
Makes density comparisons, bingo coverage, and credit spend reviewable before Phase 3. -->

# Phase 2 tuning review

Week **2026-W46**, batch **Fall 2026**, scoring version `v1-ac78c5b97c1f`.
**30 selected, 29 scored, 1 unscored.**
The approved dictionary and weights are unchanged. Company bingo is presented as **best line X/5**, and cohort-wide cards show company counts per phrase. Historical individual BINGO incidence for YC remains 0/29, 0.0%; no card or scoring rules were tuned toward funnier results.

## Cohort comparison

The dictionary, weights, matching, formula, minimum text length, and fixed card are identical for both cohorts. The comparison source and systematic selection were frozen before crawling. See [the source note](COMPARISON.md). No results-driven tuning or company replacement was performed.

| Cohort | Selected | Scored | Unscored | Median density | Zero-hit companies | Zero-hit percentage |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Fall 2026 | 30 | 29 | 1 | 0.136 | 12/29 | 41.4% |
| BVP public cloud comparison | 50 | 49 | 1 | 1.565 | 0/49 | 0.0% |

Density means weighted hits per 100 words. The median gives each company equal weight. Zero-hit percentages use valid scored pages as the denominator; unscored pages never count as zero. These are descriptive differences between selected homepage cohorts, not a causal claim about company age or YC membership.

## Top phrases by cohort

Order by total accepted occurrences, then company coverage, then dictionary order. Company coverage distinguishes repeated wording on one page from a widespread phrase.

### Fall 2026

| Phrase | Weight | Occurrences | Companies hit |
| --- | ---: | ---: | ---: |
| end-to-end | 1 | 5 | 5/29 |
| AI agent | 1 | 5 | 3/29 |
| AI-powered | 2 | 4 | 3/29 |
| agentic | 1 | 3 | 3/29 |
| unlock | 1 | 3 | 2/29 |
| leverage | 1 | 3 | 1/29 |
| scalable | 1 | 2 | 2/29 |
| 10x | 3 | 2 | 2/29 |
| the future of | 3 | 2 | 2/29 |
| AI assistant | 2 | 2 | 1/29 |

### BVP public cloud comparison

| Phrase | Weight | Occurrences | Companies hit |
| --- | ---: | ---: | ---: |
| agentic | 1 | 124 | 28/49 |
| AI agent | 1 | 99 | 28/49 |
| AI-powered | 2 | 62 | 22/49 |
| next-generation | 2 | 38 | 5/49 |
| seamless | 1 | 35 | 17/49 |
| streamline | 1 | 32 | 17/49 |
| empower | 1 | 31 | 17/49 |
| end-to-end | 1 | 30 | 12/49 |
| AI-native | 3 | 30 | 10/49 |
| ecosystem | 1 | 28 | 15/49 |

## Cohort-wide bingo cards

A phrase cell is hit if any valid scored company used it. Each label counts distinct companies, even if a page repeats the phrase many times. Bold cells are hit. FREE is automatic and has no company count. This uses the approved fixed card without changing its phrases.

### Fall 2026

Cohort best line: **4/5**. Completed lines: none.

| B | I | N | G | O |
| --- | --- | --- | --- | --- |
| **AI-powered (3/29)** | seamless (0/29) | **10x (2/29)** | best-in-class (0/29) | **unlock (2/29)** |
| paradigm shift (0/29) | unprecedented (0/29) | world-class (0/29) | **empower (1/29)** | **next-generation (1/29)** |
| **the future of (2/29)** | **leverage (1/29)** | **FREE** | supercharge (0/29) | AI-native (0/29) |
| game-changing (0/29) | **superintelligence (1/29)** | **revolutionize (1/29)** | unparalleled (0/29) | industry-leading (0/29) |
| frictionless (0/29) | first-ever (0/29) | **cutting-edge (1/29)** | **all-in-one (1/29)** | AI-driven (0/29) |

### BVP public cloud comparison

Cohort best line: **5/5**. Completed lines: row-1, row-3, row-4, row-5, column-2, column-3, column-4, column-5, diagonal-main, diagonal-anti.

| B | I | N | G | O |
| --- | --- | --- | --- | --- |
| **AI-powered (22/49)** | **seamless (17/49)** | **10x (1/49)** | **best-in-class (5/49)** | **unlock (16/49)** |
| paradigm shift (0/49) | **unprecedented (2/49)** | **world-class (3/49)** | **empower (17/49)** | **next-generation (5/49)** |
| **the future of (9/49)** | **leverage (8/49)** | **FREE** | **supercharge (3/49)** | **AI-native (10/49)** |
| **game-changing (3/49)** | **superintelligence (1/49)** | **revolutionize (2/49)** | **unparalleled (1/49)** | **industry-leading (8/49)** |
| **frictionless (3/49)** | **first-ever (1/49)** | **cutting-edge (1/49)** | **all-in-one (10/49)** | **AI-driven (8/49)** |

## Per-company best line

Best line is the highest number of marked cells in any of the twelve rows, columns, or diagonals, including FREE. A zero-buzzword page therefore starts at 1/5 on a line through FREE. All tied best lines and all cell states are stored in the score files. Individual BINGO remains derivable, but line progress is the company-level presentation.

### Fall 2026

| Company | Best line | Density |
| --- | ---: | ---: |
| [Adalat AI](.local/scrapes/2026-W46/adalat-ai.json) | 3/5 | 1.64 |
| [Aikido Technologies](.local/scrapes/2026-W46/aikido-technologies.json) | 2/5 | 1.78 |
| [Petrichor](.local/scrapes/2026-W46/petrichor.json) | 2/5 | 1.13 |
| [ChemPilot.ai](.local/scrapes/2026-W46/chempilotai.json) | 2/5 | 0.84 |
| [Hickory &amp; Company](.local/scrapes/2026-W46/hickory-and-company.json) | 2/5 | 0.81 |
| [Applied Kinetics](.local/scrapes/2026-W46/applied-kinetics.json) | 2/5 | 0.63 |
| [0.security](.local/scrapes/2026-W46/0security.json) | 2/5 | 0.43 |
| [Native](.local/scrapes/2026-W46/native.json) | 2/5 | 0.14 |
| [Acyclic Labs](.local/scrapes/2026-W46/acyclic.json) | 1/5 | 1.64 |
| [Preload](.local/scrapes/2026-W46/preload.json) | 1/5 | 0.51 |
| [The Agentic Data Co.](.local/scrapes/2026-W46/the-agentic-data-co.json) | 1/5 | 0.33 |
| [Adside.ai](.local/scrapes/2026-W46/adsideai.json) | 1/5 | 0.29 |
| [Alkera AI](.local/scrapes/2026-W46/alkera-ai.json) | 1/5 | 0.27 |
| [Covera](.local/scrapes/2026-W46/covera.json) | 1/5 | 0.21 |
| [Summer Engine](.local/scrapes/2026-W46/summer-engine.json) | 1/5 | 0.14 |
| [Yam](.local/scrapes/2026-W46/yam.json) | 1/5 | 0.10 |
| [Agent 37](.local/scrapes/2026-W46/agent-37.json) | 1/5 | 0.08 |
| [Agent Relay](.local/scrapes/2026-W46/agent-relay.json) | 1/5 | 0.00 |
| [Ageospatial](.local/scrapes/2026-W46/ageospatial.json) | 1/5 | 0.00 |
| [Ailit](.local/scrapes/2026-W46/ailit.json) | 1/5 | 0.00 |
| [Audora](.local/scrapes/2026-W46/audora.json) | 1/5 | 0.00 |
| [Dreamscale Labs](.local/scrapes/2026-W46/dreamscale-labs.json) | 1/5 | 0.00 |
| [GrayPass](.local/scrapes/2026-W46/graypass.json) | 1/5 | 0.00 |
| [Kanopy](.local/scrapes/2026-W46/kanopy.json) | 1/5 | 0.00 |
| [Lux Foods](.local/scrapes/2026-W46/lux-foods.json) | 1/5 | 0.00 |
| [Ordo Labs](.local/scrapes/2026-W46/ordo-labs.json) | 1/5 | 0.00 |
| [River](.local/scrapes/2026-W46/rivereditor.json) | 1/5 | 0.00 |
| [Saccade](.local/scrapes/2026-W46/saccade.json) | 1/5 | 0.00 |
| [Vorelios](.local/scrapes/2026-W46/vorelios.json) | 1/5 | 0.00 |
| Topos | Unscored: insufficient_text | N/A |

### BVP public cloud comparison

| Company | Best line | Density |
| --- | ---: | ---: |
| [Crowdstrike](.local/scrapes/2026-W46/bvp-crwd.json) | 5/5 | 3.73 |
| [Sprinklr](.local/scrapes/2026-W46/bvp-cxm.json) | 4/5 | 4.23 |
| [Palo Alto Networks](.local/scrapes/2026-W46/bvp-panw.json) | 4/5 | 3.75 |
| [Asana](.local/scrapes/2026-W46/bvp-asan.json) | 4/5 | 3.58 |
| [Waystar](.local/scrapes/2026-W46/bvp-way.json) | 3/5 | 4.69 |
| [Okta](.local/scrapes/2026-W46/bvp-okta.json) | 3/5 | 3.48 |
| [Freshworks](.local/scrapes/2026-W46/bvp-frsh.json) | 3/5 | 3.06 |
| [Datadog](.local/scrapes/2026-W46/bvp-ddog.json) | 3/5 | 3.01 |
| [SentinelOne](.local/scrapes/2026-W46/bvp-s.json) | 3/5 | 2.72 |
| [Tenable](.local/scrapes/2026-W46/bvp-tenb.json) | 3/5 | 2.26 |
| [Adobe](.local/scrapes/2026-W46/bvp-adbe.json) | 3/5 | 2.23 |
| [Intapp](.local/scrapes/2026-W46/bvp-inta.json) | 3/5 | 2.15 |
| [Veeva Systems](.local/scrapes/2026-W46/bvp-veev.json) | 3/5 | 1.98 |
| [Agilysys](.local/scrapes/2026-W46/bvp-agys.json) | 3/5 | 1.97 |
| [Qualys](.local/scrapes/2026-W46/bvp-qlys.json) | 3/5 | 1.89 |
| [Salesforce](.local/scrapes/2026-W46/bvp-crm.json) | 3/5 | 1.70 |
| [Q2](.local/scrapes/2026-W46/bvp-qtwo.json) | 3/5 | 1.56 |
| [Netskope](.local/scrapes/2026-W46/bvp-ntsk.json) | 3/5 | 1.36 |
| [Paycom](.local/scrapes/2026-W46/bvp-payc.json) | 3/5 | 1.14 |
| [ServiceTitan](.local/scrapes/2026-W46/bvp-ttan.json) | 3/5 | 0.96 |
| [Samsara](.local/scrapes/2026-W46/bvp-iot.json) | 3/5 | 0.83 |
| [DocuSign](.local/scrapes/2026-W46/bvp-docu.json) | 3/5 | 0.81 |
| [Twilio](.local/scrapes/2026-W46/bvp-twlo.json) | 3/5 | 0.63 |
| [Wix](.local/scrapes/2026-W46/bvp-wix.json) | 3/5 | 0.58 |
| [DigitalOcean](.local/scrapes/2026-W46/bvp-docn.json) | 2/5 | 2.23 |
| [BlackLine](.local/scrapes/2026-W46/bvp-bl.json) | 2/5 | 2.22 |
| [Snowflake](.local/scrapes/2026-W46/bvp-snow.json) | 2/5 | 1.86 |
| [Atlassian](.local/scrapes/2026-W46/bvp-team.json) | 2/5 | 1.80 |
| [Workday](.local/scrapes/2026-W46/bvp-wday.json) | 2/5 | 1.73 |
| [MongoDB](.local/scrapes/2026-W46/bvp-mdb.json) | 2/5 | 1.67 |
| [Ringcentral](.local/scrapes/2026-W46/bvp-rng.json) | 2/5 | 1.61 |
| [Fastly](.local/scrapes/2026-W46/bvp-fsly.json) | 2/5 | 1.55 |
| [Nutanix](.local/scrapes/2026-W46/bvp-ntnx.json) | 2/5 | 1.49 |
| [Figma](.local/scrapes/2026-W46/bvp-fig.json) | 2/5 | 1.48 |
| [AvePoint](.local/scrapes/2026-W46/bvp-avpt.json) | 2/5 | 1.46 |
| [Zeta](.local/scrapes/2026-W46/bvp-zeta.json) | 2/5 | 1.35 |
| [Paylocity](.local/scrapes/2026-W46/bvp-pcty.json) | 2/5 | 1.33 |
| [AppFolio](.local/scrapes/2026-W46/bvp-appf.json) | 2/5 | 1.11 |
| [Braze](.local/scrapes/2026-W46/bvp-brze.json) | 2/5 | 0.81 |
| [Toast](.local/scrapes/2026-W46/bvp-tost.json) | 2/5 | 0.76 |
| [Cellebrite](.local/scrapes/2026-W46/bvp-clbt.json) | 2/5 | 0.44 |
| [PagerDuty](.local/scrapes/2026-W46/bvp-pd.json) | 1/5 | 1.58 |
| [Elastic](.local/scrapes/2026-W46/bvp-estc.json) | 1/5 | 1.02 |
| [Gitlab](.local/scrapes/2026-W46/bvp-gtlb.json) | 1/5 | 0.78 |
| [Klaviyo](.local/scrapes/2026-W46/bvp-kvyo.json) | 1/5 | 0.72 |
| [HubSpot](.local/scrapes/2026-W46/bvp-hubs.json) | 1/5 | 0.66 |
| [Zscaler](.local/scrapes/2026-W46/bvp-zs.json) | 1/5 | 0.42 |
| [Monday.com](.local/scrapes/2026-W46/bvp-mndy.json) | 1/5 | 0.37 |
| [Shopify](.local/scrapes/2026-W46/bvp-shop.json) | 1/5 | 0.34 |
| Rubrik | Unscored: insufficient_text | N/A |

[Full comparison data](data/comparisons/2026-W46.json) includes exact statistics, all phrase frequencies, both cohort cards, and every company's best line.


## Sample and credits

Keep the original ten. A strict every-eighth sweep of the 225-company list has 27 additional candidates. To respect thirty total companies and twenty new requests, select twenty evenly across those candidates. Positions below are one-based; the grid uses zero-based indices divisible by eight.

Added positions: 17, 25, 41, 49, 57, 73, 81, 97, 105, 113, 129, 137, 145, 161, 169, 185, 193, 201, 217, 225.

[Pinned sample and cohort membership](data/samples/fall-2026-tuning.json). This is a deterministic tuning sample with extra weight on the original A-heavy cohort, not a random estimate of the whole batch.

**YC expansion credits: 20. Comparison-cohort credits: 50. Project total credits: 80.** The original ten were cache hits. Report generation and scoring use no scrape or LLM credits.

| Expansion run | New requests | Cache hits | Credits used |
| --- | ---: | ---: | ---: |
| [5598be7c-8d94-4d2a-bb9d-efc90f275295](data/runs/5598be7c-8d94-4d2a-bb9d-efc90f275295.json) | 20 | 10 | 20 |
| [e328aebf-ab33-4c64-a80b-dbf270960062](data/runs/e328aebf-ab33-4c64-a80b-dbf270960062.json) | 0 | 30 | 0 |

## Top ten by density

Density is weighted hits per 100 homepage words. Counts below are raw accepted occurrences, including repeats. All fifty phrase counts, including zeros, and category contributions are in the score JSON.

| Rank | Company | Density | Best line | Words | Weighted hits | Per-phrase counts |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | [Aikido Technologies](.local/scrapes/2026-W46/aikido-technologies.json) | 1.78 | 2/5 | 338 | 6 | robust ×1; unlock ×2; 10x ×1 |
| 2 | [Acyclic Labs](.local/scrapes/2026-W46/acyclic.json) | 1.64 | 1/5 | 304 | 5 | agentic workflow ×1; exponential ×1 |
| 3 | [Adalat AI](.local/scrapes/2026-W46/adalat-ai.json) | 1.64 | 3/5 | 1223 | 20 | AI-powered ×1; leverage ×3; empower ×1; streamline ×2; end-to-end ×1; cutting-edge ×1; revolutionize ×2; the future of ×1 |
| 4 | [Petrichor](.local/scrapes/2026-W46/petrichor.json) | 1.13 | 2/5 | 532 | 6 | superintelligence ×2 |
| 5 | [ChemPilot.ai](.local/scrapes/2026-W46/chempilotai.json) | 0.84 | 2/5 | 357 | 3 | the future of ×1 |
| 6 | [Hickory &amp; Company](.local/scrapes/2026-W46/hickory-and-company.json) | 0.81 | 2/5 | 372 | 3 | 10x ×1 |
| 7 | [Applied Kinetics](.local/scrapes/2026-W46/applied-kinetics.json) | 0.63 | 2/5 | 630 | 4 | AI-powered ×1; AI agent ×1; end-to-end ×1 |
| 8 | [Preload](.local/scrapes/2026-W46/preload.json) | 0.51 | 1/5 | 393 | 2 | end-to-end ×1; scalable ×1 |
| 9 | [0.security](.local/scrapes/2026-W46/0security.json) | 0.43 | 2/5 | 1644 | 7 | AI-powered ×2; AI agent ×3 |
| 10 | [The Agentic Data Co.](.local/scrapes/2026-W46/the-agentic-data-co.json) | 0.33 | 1/5 | 306 | 1 | agentic ×1 |

## Bottom five, the honest ones

The label is satire about wording, not a claim about honesty or product quality. Zero-score ties use stable slug order. Unscored pages are excluded.

| Company | Density | Words | Per-phrase counts |
| --- | ---: | ---: | --- |
| [Agent Relay](.local/scrapes/2026-W46/agent-relay.json) | 0.00 | 651 | None |
| [Ageospatial](.local/scrapes/2026-W46/ageospatial.json) | 0.00 | 373 | None |
| [Ailit](.local/scrapes/2026-W46/ailit.json) | 0.00 | 421 | None |
| [Audora](.local/scrapes/2026-W46/audora.json) | 0.00 | 520 | None |
| [Dreamscale Labs](.local/scrapes/2026-W46/dreamscale-labs.json) | 0.00 | 196 | None |

12 of 29 scored companies have no dictionary hits; the table shows the first five by slug.

## Ten most-hit phrases

Sort by total accepted occurrences, then company coverage, then dictionary order. Coverage uses the 29 scored pages, not the failed or insufficient pages. Raw counts can be driven by one long or repetitive homepage, so both columns matter.

| Phrase | Weight | Total occurrences | Companies hit | Coverage |
| --- | ---: | ---: | ---: | ---: |
| end-to-end | 1 | 5 | 5 | 17.2% |
| AI agent | 1 | 5 | 3 | 10.3% |
| AI-powered | 2 | 4 | 3 | 10.3% |
| agentic | 1 | 3 | 3 | 10.3% |
| unlock | 1 | 3 | 2 | 6.9% |
| leverage | 1 | 3 | 1 | 3.4% |
| scalable | 1 | 2 | 2 | 6.9% |
| 10x | 3 | 2 | 2 | 6.9% |
| the future of | 3 | 2 | 2 | 6.9% |
| AI assistant | 2 | 2 | 1 | 3.4% |

No weights were adjusted after this measurement. Generic AI and generic agent remain excluded. Longer accepted phrases take precedence, so agentic workflow does not also count as agentic at the same position. Phrase presence describes the words used, not whether a technical claim is justified.

## Two real highlighted excerpts

### Aikido Technologies

> … final assembly time by **10x**, **unlocking** more port facilities and supply chain …

[Saved text](.local/scrapes/2026-W46/aikido-technologies.json), character range 960–1035. Bold text marks accepted matches, using the same escaped highlighting function intended for the site.

### Acyclic Labs

> … agent swarms. Make any **agentic workflow** **exponentially** faster. Funded by Y Combinator …

[Saved text](.local/scrapes/2026-W46/acyclic.json), character range 6–91. Bold text marks accepted matches, using the same escaped highlighting function intended for the site.

## Unscored companies

- Topos: insufficient_text, 32 words. It contributes neither a zero score nor a ranking position.

## Rules and reproducibility

- Formula: `100 * weightedHits / wordCount`. Keep full precision for ranking and show two decimals.
- Match explicit case-insensitive variants at Unicode word boundaries. Spaces and common hyphens can separate phrase words. Resolve overlaps by longest span, then dictionary order.
- Score only saved visible homepage text. Titles, descriptions, directory text, and LLM output are excluded.
- Store exact text spans, per-phrase counts, category totals, cell hits, completed lines, source paths, and source text hashes.
- Use the same fixed card for every company, with a free centre and twelve possible complete lines.

The complete score file is [data/scores/2026-W46.json](data/scores/2026-W46.json). Its embedded dictionary and card plus source text hashes identify the inputs. Repeated scoring with the same `--week` produces identical JSON.

Reproduce with:

```sh
npm run crawl -- --sample fall-2026-tuning --limit 30
npm run crawl -- --cohort bvp-established --limit 50
npm run score -- --week 2026-W46
npm run score -- --cohort bvp-established --week 2026-W46
npm run compare -- --week 2026-W46
npm run report:phase2 -- --week 2026-W46
npm run check
npm test
```

The repeated crawls use the local cache. The approved comparison adds fifty requests, for eighty lifetime requests and credits including the thirty YC captures. After the completed fifty-company comparison crawl, no further captures are authorized.

**This is satire, made with love.** Only companies are ranked. The Phase 2 gate is ready for dictionary review; site work, AI extras, a full-batch run, cron, and deployment have not started.
