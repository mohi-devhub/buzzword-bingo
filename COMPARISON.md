<!-- Defines the established-company comparison source and selection rule.
Locks membership before scraping so results cannot influence the cohort. -->

# Established-company comparison

Use the [BVP Nasdaq Emerging Cloud Index directory](https://cloudindex.bvp.com/companies). Its 64 public cloud-company names and tickers were frozen in `data/sources/bvp-established.json` on November 11, 2026, before crawling.

Sort by case-folded name, then ticker. Select 50 positions with `round(i * (N - 1) / 49)` for `i = 0..49`. Membership depends only on this rule and the frozen list. No replacements follow failed captures or scores. `--count` configures a new cohort's size.

Homepage provenance includes Wikidata entity IDs, revisions, and website statements. Thirteen missing or incorrect mappings were checked against official company links in `data/sources/bvp-homepage-overrides.json`. Address corrections preceded crawling and never changed membership. Request each site's origin homepage, allowing redirects. Metadata text never enters scores.

Configure `data/cohorts/<name>.json`; crawl and score it with `--cohort <name>`. The comparison sample used 50 requests. Phase 4 authorizes completion of the pinned YC batch within a cumulative cap of 300 credits. Both cohorts use identical extraction, caching, minimum-text rules, dictionary, weights, and density maths.

Report the share of scored companies using “agentic” at least once, with raw mention counts secondary. Compare median company density and zero-hit percentage among valid scored pages, reporting unscored counts separately. Cohort card cells count companies once. Best-line progress includes FREE.

Public listing defines established here. The cohorts differ in industry, size, and page length; The Phase 4 YC cohort includes all 225 active companies with valid homepages in the pinned Fall 2026 snapshot, including the original cached 30. No replacements follow failures. This source may omit unlaunched or unlisted companies. Results are descriptive. This is satire, made with love.
