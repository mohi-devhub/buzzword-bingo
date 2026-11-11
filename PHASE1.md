<!-- Reports the completed Phase 1 sample using saved public data and usage receipts.
Keeps the review gate verifiable without spending another scrape credit. -->

# Phase 1 review

Starting batch: **Fall 2026**. List fetched at `2026-11-11T09:58:43.773Z`.
Upstream metadata last updated at `2026-11-11T03:51:00.560Z`.

## Batch selection

| Batch | Listed | Active | Active with website | Eligible after validation |
| --- | ---: | ---: | ---: | ---: |
| [Summer 2027](https://yc-oss.github.io/api/batches/summer-2027.json) | 1 | 1 | 1 | 1 |
| [Winter 2027](https://yc-oss.github.io/api/batches/winter-2027.json) | 10 | 10 | 10 | 10 |
| [Fall 2026](https://yc-oss.github.io/api/batches/fall-2026.json) | 226 | 226 | 225 | 225 |
| [Summer 2026](https://yc-oss.github.io/api/batches/summer-2026.json) | 227 | 226 | 226 | 226 |

Fall 2026 is the newest available batch with at least 100 eligible companies. The saved list contains 225 companies. The sample is the first ten by stable slug and YC ID, with no replacements or selection by homepage wording.

## Captured homepages

10 attempted, 10 successful, 0 unscored. No buzzword scores have been computed.

| Company | Word count | Capture |
| --- | ---: | --- |
| 0.security | 1644 | [scraped](.local/scrapes/2026-W46/0security.json) |
| Acyclic Labs | 304 | [scraped](.local/scrapes/2026-W46/acyclic.json) |
| Adalat AI | 1223 | [scraped](.local/scrapes/2026-W46/adalat-ai.json) |
| Adside.ai | 1033 | [scraped](.local/scrapes/2026-W46/adsideai.json) |
| Agent 37 | 1321 | [scraped](.local/scrapes/2026-W46/agent-37.json) |
| Agent Relay | 651 | [scraped](.local/scrapes/2026-W46/agent-relay.json) |
| Ageospatial | 373 | [scraped](.local/scrapes/2026-W46/ageospatial.json) |
| Aikido Technologies | 338 | [scraped](.local/scrapes/2026-W46/aikido-technologies.json) |
| Ailit | 421 | [scraped](.local/scrapes/2026-W46/ailit.json) |
| Alkera AI | 370 | [scraped](.local/scrapes/2026-W46/alkera-ai.json) |

Each JSON capture includes the requested and final URL, timestamps, title, description, rendered markdown, extracted visible text, word count, extraction version, and usage receipt. The `result.text` field is the exact text reserved for later scoring. Navigation and footer selectors were excluded through the provider, with main-content filtering enabled. Repeated carousel content and page UI that survive the provider filters are retained for review.

## Three stored texts to review

- [Alkera AI, 370 words](.local/scrapes/2026-W46/alkera-ai.json). Inspect `result.text` for the complete stored text.

- [Ailit, 421 words](.local/scrapes/2026-W46/ailit.json). Inspect `result.text` for the complete stored text.

- [Aikido Technologies, 338 words](.local/scrapes/2026-W46/aikido-technologies.json). Inspect `result.text` for the complete stored text.

Print these three full stored texts locally with `npm run sample`. That command reads only JSON files.

## Credit accounting

| Run | Requests | Cache hits | Credits used | Basis |
| --- | ---: | ---: | ---: | --- |
| [1](data/runs/de1b62be-84de-4614-992f-b2868e8d7e39.json) | 10 | 0 | 10 | Provider-reported |
| [2](data/runs/ba964a2f-09fb-432f-868a-37f619fcb06a.json) | 0 | 10 | 0 | No requests |

**Total credits used: 10.** 10 requests have provider-reported receipts. Company-list requests and report generation cost no Context.dev credits.

The first and repeated crawl both used `npm run crawl -- --limit 10`. The second run made no SDK calls, and the canonical cache contents remained identical. Ten credits are authorized in `data/policy.json`; a different batch or week cannot silently increase that allowance.

## Cadence and next gate

Ordinary crawls reuse prior attempts across weeks. `--refresh` is rejected unless the date is the first Monday of a month in UTC. Current-week and current-month attempts are still reused. A failed or interrupted request is cached too. Automated batch progression, cron, and deployment remain Phase 4 work.

The plan now uses the requested weight-1 terms and a rarer fixed bingo card. Phase 2 will report the BINGO count and percentage against the below-about-20% target. No scoring, site, AI feature, full-batch crawl, cron, or deployment has started.

## Verification

- `npm run check` checks strict TypeScript types.
- `npm test` covers file-backed cache reuse, duplicate URLs, failed and interrupted attempts, date restrictions, spending caps, opt-outs, the crawl lock, and visible-text extraction.
- `npm run report` regenerates this report from saved data.
- `.env` is ignored by Git. `.env.example` contains no key. The SDK reads its key explicitly from `.env`, with retries and debug logging disabled.

Phase 1 is ready for review. Stop here until Phase 2 is approved.
