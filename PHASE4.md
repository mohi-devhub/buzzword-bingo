<!-- Records the full-batch result and Phase 4 release gate.
Keeps the evidence reviewable before any public deployment. -->

# Phase 4 gate

The full pinned **YC Fall 2026** crawl is complete. No public deployment, push, launch post, or workflow activation was performed.

## Credits and coverage

The estimate before crawling was 195 new credits, plus 80 already used, for 275 cumulative against the approved cap of 300.

The run used **195 new requests**, **30 cached companies**, and **195 new credits** (provider-reported). Cumulative usage: **275/300 credits**. Remaining authorization: 25 credits. Failures were retained without replacement requests. Run receipt: [4995a479-8053-4474-9556-8aab5384ef2c](data/runs/4995a479-8053-4474-9556-8aab5384ef2c.json).

| Measure | YC Fall 2026 | Public cloud |
| --- | ---: | ---: |
| Eligible / selected homepages | 225 | 50 |
| Scored | 215 | 49 |
| Unscored | 10 | 1 |
| Median density | 0.086 | 1.565 |
| Zero dictionary hits | 99/215 (46.0%) | 0/49 (0.0%) |
| Companies using agentic | 14/215 (6.5%) | 28/49 (57.1%) |
| Raw agentic mentions, secondary | 18 | 124 |
| Cohort best line | 5/5 | 5/5 |

**The sample headline still holds:** the public-cloud cohort has higher median density. The site reports the actual result regardless of direction. This describes captured homepage wording; it is not a product-quality or honesty judgment.

The home and comparison OG lead with the share of scored companies using agentic, including numerator, denominator, and percentage. Repeated mentions remain secondary. The pinned community list may omit unlaunched or unlisted YC companies. The established cohort remains the same systematic sample; [COMPARISON.md](COMPARISON.md) gives the selection and homepage caveats.

## Unscored YC homepages

| Company | Reason | Saved words |
| --- | --- | ---: |
| Archangel Health | insufficient_text | 28 |
| Aviern | partial_page | 18 |
| Epsilab | insufficient_text | 30 |
| Gradon | insufficient_text | 42 |
| Keres | insufficient_text | 27 |
| Metalcraft | insufficient_text | 24 |
| Open Actuation | insufficient_text | 13 |
| Proto | insufficient_text | 46 |
| Theseus Robotics | insufficient_text | 35 |
| Topos | insufficient_text | 32 |

## Prepared operations

- Full homepage text and markdown live only in the gitignored .local/ store. Public scores contain word counts, source hashes, and only the short evidence displayed on company pages.
- Refreshes and re-scoring run manually and locally. No scheduled crawl workflow remains, and AUTOMATION_ENABLED stays false at launch.
- A combined YC plus public-cloud monthly refresh needs about 275 credits; only 25 remain authorized. No additional scrape spend is approved.
- The static build uses committed data alone; no .local/ store or scrape credentials are needed in GitHub Actions.
- GitHub Pages URL: https://mohi-devhub.github.io/buzzword-bingo/. Base path: /buzzword-bingo/. Absolute share links and OG URLs use that origin.
- Public deploy jobs require DEPLOY_ENABLED=true. AUTOMATION_ENABLED remains false and no scheduled crawl workflow exists. Deployment remains disabled; no remote settings were changed.
- optOutRepositoryReady is true as requested. The GitHub issue destination is configured; repository access returned 404 during preparation, so verify public access before release.

## Review artifacts

[README](README.md) explains local use, budget policy, opt-outs, workflow recovery, and release setup. [LAUNCH.md](LAUNCH.md) contains the three generated launch drafts. [data/release-results.json](data/release-results.json) records source hashes and the exact generated figures. [Phase 4 screenshots](artifacts/phase4/) show the final static build.

**Stopped at the Phase 4 gate before deployment.** See artifacts/phase4/verification.json for the checks actually run. To refresh this report and the drafts from new full-batch data, run npm run report:phase4.
