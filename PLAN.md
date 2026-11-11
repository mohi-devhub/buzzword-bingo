<!-- Describes Buzzword Bingo's data, scoring, site, and phased delivery.
Keeps implementation and credit spend behind the user's review gates. -->

# Buzzword Bingo plan

Before the first public push, the owner changed the publication boundary: full text and markdown remain in gitignored `.local/scrapes/` and `.local/cache/`. Public scores retain word counts, source hashes, only the two twelve-word excerpts and phrase examples actually shown on company pages, and numeric scores. Builds use committed data alone. Re-crawls and re-scoring are manual local operations; the scheduled crawl workflow is removed and AUTOMATION_ENABLED stays false. Only 25 credits remain authorized; a combined monthly refresh would need about 275. The owner will create the public repository, push, and enable Pages using PUSH.md; the coding agent stops after instructions.

## Verified YC source and starting batch

Use the unofficial [yc-oss API](https://github.com/yc-oss/api). On November 11, 2026, direct HTTP requests returned `200` and valid JSON from both endpoints:

- [API metadata](https://yc-oss.github.io/api/meta.json), reporting an update at `2026-11-11T03:51:00.560Z`.
- [Fall 2026 companies](https://yc-oss.github.io/api/batches/fall-2026.json), containing 226 records, all active, with 225 valid websites.
- [Summer 2026 companies](https://yc-oss.github.io/api/batches/summer-2026.json), containing 227 records, of which 226 are active with valid websites.

Phase 1 rechecked these responses and saved the counts and source timestamps in `data/companies.json`. Newer Summer 2027 and Winter 2027 batches have only 1 and 10 eligible companies respectively. Fall 2026 is therefore the most recent batch with at least 100 active companies with websites. The source contains publicly launched companies, so this is not necessarily the complete YC batch. The project never requests ycombinator.com directly.

The actual record fields include:

| Required information | Source field | Project use |
| --- | --- | --- |
| Stable identity | `id`, `slug` | Keep the YC ID and a stable project slug |
| Company name | `name` | Company display name |
| Homepage | `website` | Scrape this address, never the `url` field, which points to YC |
| Batch | `batch` | Exact batch filter |
| Description | `one_liner` | Directory metadata only, excluded from scoring |
| Status | `status` | Include exactly `Active` |
| Logo | `small_logo_thumb_url` | Local build asset where available, with initials fallback |

Start with **Fall 2026**. Default import discovers batch endpoints through `meta.json` and chooses the newest batch with at least 100 eligible companies. Allow an explicit `--batch "Fall 2026"` override. Validate HTTP or HTTPS websites, apply opt-outs, then sort by stable slug and YC ID before selecting companies. The sample is reproducible, not a selection of the funniest results.

If GitHub Pages is unavailable, use the same files from [the yc-oss GitHub repository](https://github.com/yc-oss/api/tree/main/batches). If both are unavailable, retain the last validated local company list, label its fetch date, and fail clearly if no local list exists. Do not substitute invented companies or scrape YC.

## Framework and runtime

The established comparison source is specified in [COMPARISON.md](COMPARISON.md). It freezes fifty systematic selections from the BVP directory's 64 public cloud companies, with auditable homepage metadata and address corrections made before crawling. `data/cohorts/<name>.json` configures the second cohort, selected through `--cohort <name>`. Comparison IDs use a separate numeric namespace starting at one billion; slugs have a `bvp-` prefix. The YC company list and sample are retained separately. Weekly comparison scores live at `data/scores/<week>/<cohort>.json`, with descriptive results and cohort cards at `data/comparisons/<week>.json`.

Choose **Astro with static output**. The site consists of JSON-backed pages with two small browser interactions: leaderboard controls and the playable card. Astro generates HTML for each company without a server or a React runtime. Its [deployment documentation](https://docs.astro.build/en/guides/deploy/) covers static hosting.

Use **Node 22.23.4 or newer**, TypeScript **6.0.3**, npm, and `tsx` for scripts. Phase 3 pins **Astro 7.4.10** after the dependency audit identified vulnerabilities in the older compatible release. The newer Astro release requires Node 22.23.4; the project-local `node` development dependency supplies it to npm scripts without changing the machine's global runtime. TypeScript 6 satisfies Astro checker's supported peer range. These are version updates within the requested Node 20+ / TypeScript / Astro stack. The `fflate` override to 0.8.3 patches the transitive image-renderer dependency; `npm audit` reports zero vulnerabilities.

Use plain CSS and small browser scripts. Generate PNG share cards at build time with Satori and a local SVG-to-PNG renderer, using a bundled font. The build emits `dist/` and makes no Context.dev or OpenAI calls. Vercel serves those files; GitHub Pages is also supported through configurable site URL and base path.

## Scraping and secrets

Phase 1 begins with `.gitignore` and `.env.example`, before any first commit. Ignore `.env`, other local secret variants, `node_modules/`, and `dist/`, while explicitly retaining `.env.example`. The example has an empty `CONTEXT_DEV_API_KEY`. Add an empty `OPENAI_API_KEY` only if you later approve the optional AI feature.

Load the key explicitly from the root `.env`, pass it explicitly to the SDK, and never rely on a key inherited from the shell. Never print keys or include them in committed data, client bundles, build output, or error logs.

Before writing the scraper, run `npm install context.dev` and read its installed README, package exports, TypeScript declarations, and relevant bundled documentation in `node_modules`. This was completed for **context.dev 3.28.0** before implementing the scraper. Verified sources were `README.md`, `resources/web.d.ts`, `client.d.ts`, `src/client.ts`, and `core/error.d.ts`. The README documents provider-side JavaScript rendering. The actual method is `client.web.scrape`, with `formats: { markdown: true }`; the text is `response.markdown.data`, gated by `markdown.success`. `sharedParams.mainContentOnly` and `excludeSelectors` filter navigation and footers. `markdownParams.sourcePreference: ['html-conversion']` uses rendered HTML rather than publisher-supplied markdown. Metadata comes from `metadata.title` and `metadata.description`. The provider reports request usage through `key_metadata.credits_consumed` and `credits_remaining` when present. Set `maxRetries: 0`, a 45-second provider deadline, a 60-second client timeout, a fixed API origin, and `logLevel: 'off'`. Only markdown output is requested. `maxAgeMs: 0` requests a fresh initial capture; later runs use the local cache and make no API call.

Request only each public homepage through Context.dev, with JavaScript rendering and markdown output using the verified SDK options. No linked-page crawling, login, directory descriptions, search snippets, or LLM-generated text enters the score.

Prefer the service's main-content extraction if documented. Convert markdown to visible plain text with a deterministic parser. Exclude link destinations, image alt text, markup, and code blocks. Exclude navigation, footers, and cookie UI where the service exposes enough structure to identify them reliably. Do not delete arbitrary paragraphs because they look repetitive or contain buzzwords. Keep the original markdown and record the extraction version so removal decisions are reviewable.

Store each result with company ID, slug, requested URL, normalized URL, final URL if exposed, UTC attempt timestamp, ISO week, status, title, meta description, word count, markdown, and extracted text. Use `null` for metadata the service does not expose. Title and description are stored separately and are not added again to scored text.

Blocked pages, timeouts, empty text, and extraction failures produce `unscored` records with a short reason. An interrupted attempt produces an unknown outcome rather than invented content. Never treat a failed scrape as a zero score. Pages under 50 words remain inspectable but are unscored for insufficient text, so a tiny fragment cannot win either ranking.

## Cache and credit controls

The cache key is **normalized URL plus ISO week in UTC**, such as `2026-W46`. Normalize scheme and host casing, default ports, and fragments, while preserving meaningful paths and query strings. Immutable URL-keyed records live at `.local/cache/<week>/<url-sha256>.json`. This extra JSON directory prevents a company's changed homepage URL from overwriting its old URL cache. Each company also gets its required `.local/scrapes/<week>/<slug>.json` record. Multiple companies with the same normalized homepage share one request and receipt.

**Crawl each batch once.** Normal weekly runs reuse existing attempts across all weeks, including failed attempts. Re-crawl a batch at most once per calendar month, only on the first Monday in UTC, through an explicit `--refresh`. Even then, a URL already attempted in the current month or current week cannot be requested again. Completing a partially crawled batch requests only URLs that have never been attempted. A batch is complete once every eligible homepage has an attempt or a shared cached result, including failures.

Before an API call, acquire a single-crawl lock and atomically persist an attempted cache entry and credit reservation. A successful entry, failed entry, or interrupted attempt prevents another request for that URL in the same week. Disable automatic SDK retries. There is no same-week force-refresh switch. Re-scoring always uses saved text and costs zero scrape credits.

`--limit N` defaults to `10` and selects at most N companies from the stable filtered list. Cached entries count toward the selection, so repeating the default command does not walk further through the batch or consume another ten credits. Never replace failed selections with additional companies. Requests are sequential initially.

Every crawl prints selected companies, cache hits, new attempts, successes, failures, and credits used. Print provider-reported credits when the SDK exposes them. Otherwise label the value explicitly as an estimate based on one credit per submitted homepage request, including failures. Never claim an estimate is a measured account balance. Print zero for a cache-only run.

Maintain a committed request ledger with timestamps and per-run totals. Before each new request, check both the approved allowance and a monthly allowance. Phase 1 allowed ten credits, and the first Phase 2 expansion raised the cumulative authorization to thirty. The reviewed Phase 2 extension added fifty comparison requests, bringing prior usage to eighty requests and provider-reported credits. Phase 4 approves the remaining 195 requests, with `data/policy.json` allowing 225 selected companies, 195 new requests per run, and a cumulative cap of 300 requests and credits. The CLI still defaults to `--limit 10`. Both request-count and credit limits apply, even to responses reported as free. The CLI default remains ten selected companies. The full batch was estimated at 195 new credits and 275 cumulative. Lifetime authorization never resets monthly; future cohorts or complete monthly refreshes require sufficient approved headroom. The monthly ceiling starts at 1,000 credits; `externalMonthlyCredits` accounts for usage outside this repo. Reserve one estimated credit before a call, then replace it with the provider's actual charge when available. An exhausted provider balance stops further calls.

Using the user's approximate price of one credit per homepage:

| Run | Approximate credits |
| --- | ---: |
| Phase 0 verification | 0 |
| Phase 1 sample, ten previously uncached homepages | 10 |
| Same sample again in the same week | 0 |
| Phase 2 expansion, twenty new homepages and ten cache hits | 20 |
| Repeat the thirty-company tuning sample, including in later weeks | 0 |
| Reviewed Phase 2 established-company comparison, fifty new homepages | 50 |
| Total approved initial captures across both cohorts | 80 |
| Repeat the fifty-company comparison cohort | 0 |
| Full initial Fall 2026 pass, 225 eligible websites | At most about 225 before URL deduplication |
| Finish Fall 2026 after the sample, even in a later week | About 215 additional credits |
| Finish Fall 2026 after the thirty-company tuning sample | 195 new credits reported; 275 cumulative |
| Four or five normal weekly rebuilds of already crawled batches | 0 |
| Optional first-Monday refresh of Fall 2026 | At most about 225, once that month |
| Add the next untouched batch, Summer 2026 | At most about 226 |
| One Fall refresh plus one Summer initial crawl in a month | About 451 |
| Add another untouched batch | Its verified eligible URL count, only if it fits the remaining allowance |

Moving the sample to another week adds no cost because normal runs retain prior captures. The Phase 4 estimate was verified before execution: 225 eligible, 30 cached, 195 new, with a 300-credit cumulative cap. Actual usage was 195 new and 275 cumulative, all provider-reported. The earlier weekly cron plan is superseded before launch by manual local refreshes. The local refresh helper can consider at most one next batch, newest first, only if its entire initial pass fits the allowance. Re-scoring and rebuilding are explicit local commands. The first Monday may additionally refresh known batches within the allowance; when they do not all fit, retain dated captures and prioritize the oldest captures. No automatic paid retries or rollover beyond the approved ceiling. Retain completed records and mark deferred companies unscored with a budget reason. The Phase 1 collector implements cache reuse and the monthly date guard; the launch revision removes scheduling; batch progression remains a manual local tool.

## Deterministic scoring rules

The Phase 2 tuning sample preserves the original ten and adds twenty companies across the alphabet. A strict every-eighth pass has twenty-seven additional candidates. Choose twenty evenly across that grid to meet both the thirty-company total and twenty-request allowance. Pin company IDs, slugs, one-based positions, cohort membership, and the source-list timestamp in `data/samples/fall-2026-tuning.json`. This is a tuning sample with an A-heavy original cohort, not a random population estimate. Score all thirty selected companies, retaining failed or insufficient pages as unscored.

`src/score.ts` is a pure function over saved extracted text and the versioned dictionary. No network or LLM calls occur in scoring.

**Buzzword Density Score = 100 × sum of each phrase's count × its weight / word count.**

Count every accepted occurrence. Store each canonical phrase's raw count and weighted contribution, category totals, full-precision density, text match offsets, and the scoring version. Display two decimal places. Zero matched phrases on a valid page yields zero. Empty or insufficient text yields no score.

Use Unicode normalization and case-insensitive matching. Accept spaces and common Unicode hyphens between phrase words. Each dictionary row defines explicit variants; do not apply unrestricted stemming. Match at Unicode letter and number boundaries, so `seamlessly` counts through an explicit variant and `unseamly` does not. Match `10x`, `10X`, and `10×`, but not the suffix of `110x`.

Count word tokens as Unicode letters or numbers with internal apostrophes or hyphens. Thus `AI-powered` is one word, `AI powered` is two, and `10x` is one. Use that same rule for stored word counts and density. Keep offsets into the display text so highlights can be reproduced without rendering untrusted HTML.

At overlapping spans, accept the longest phrase, then dictionary order as a tie-breaker. Each span counts once. Category density uses the same full-page denominator. Rank by unrounded density, then stable slug and ID; reverse density for the least-buzzwords view. Top phrases sort by weighted contribution, then raw count, then dictionary order. History compares only the same scoring version, or explicitly labels a rules change.

### Dictionary draft: 50 phrases

Weights express how strongly a phrase fits this joke, not the quality or truth of a product. Ordinary technical language can be accurate; the site makes that limitation visible. Generic `AI` and generic `agent` are deliberately excluded.

All rows accept case differences and space or hyphen variants between words. The last column lists additional accepted forms beyond that shared rule.

| ID | Canonical phrase | Weight | Category | Additional forms |
| --- | --- | ---: | --- | --- |
| 1 | AI-powered | 2 | AI hype | A.I.-powered |
| 2 | AI-native | 3 | AI hype | A.I.-native |
| 3 | agentic | 1 | AI hype | agentically |
| 4 | copilot | 1 | AI hype | copilots, co-pilot, co-pilots |
| 5 | AI-first | 3 | AI hype | A.I.-first |
| 6 | AI-driven | 2 | AI hype | A.I.-driven |
| 7 | AI agent | 1 | AI hype | AI agents |
| 8 | autonomous agent | 3 | AI hype | autonomous agents |
| 9 | multi-agent | 1 | AI hype | multiagent |
| 10 | generative AI | 2 | AI hype | generative A.I. |
| 11 | agentic workflow | 3 | AI hype | agentic workflows |
| 12 | intelligent automation | 2 | AI hype | None |
| 13 | AI assistant | 2 | AI hype | AI assistants |
| 14 | superintelligence | 3 | AI hype | superintelligent |
| 15 | human-level | 3 | AI hype | None |
| 16 | seamless | 1 | Corporate fluff | seamlessly |
| 17 | robust | 1 | Corporate fluff | robustly |
| 18 | unlock | 1 | Corporate fluff | unlocks, unlocked, unlocking |
| 19 | leverage | 1 | Corporate fluff | leverages, leveraged, leveraging |
| 20 | empower | 1 | Corporate fluff | empowers, empowered, empowering |
| 21 | supercharge | 2 | Corporate fluff | supercharges, supercharged, supercharging |
| 22 | game-changing | 3 | Corporate fluff | game-changer, game-changers |
| 23 | streamline | 1 | Corporate fluff | streamlines, streamlined, streamlining |
| 24 | frictionless | 2 | Corporate fluff | frictionlessly |
| 25 | end-to-end | 1 | Corporate fluff | None |
| 26 | all-in-one | 1 | Corporate fluff | None |
| 27 | scalable | 1 | Corporate fluff | scalability |
| 28 | cutting-edge | 2 | Corporate fluff | None |
| 29 | next-generation | 2 | Corporate fluff | next-gen |
| 30 | best-in-class | 3 | Corporate fluff | None |
| 31 | synergy | 2 | Corporate fluff | synergies, synergistic |
| 32 | holistic | 1 | Corporate fluff | holistically |
| 33 | ecosystem | 1 | Corporate fluff | ecosystems |
| 34 | mission-critical | 2 | Corporate fluff | None |
| 35 | turnkey | 1 | Corporate fluff | turn-key |
| 36 | 10x | 3 | Big claims | 10×, 10 x, 10-x |
| 37 | revolutionize | 3 | Big claims | revolutionizes, revolutionized, revolutionizing; corresponding revolutionise forms |
| 38 | the future of | 3 | Big claims | None |
| 39 | first-ever | 3 | Big claims | None |
| 40 | world-class | 3 | Big claims | None |
| 41 | industry-leading | 3 | Big claims | None |
| 42 | groundbreaking | 3 | Big claims | ground-breaking |
| 43 | unprecedented | 3 | Big claims | None |
| 44 | transformative | 2 | Big claims | transformatively |
| 45 | limitless | 2 | Big claims | None |
| 46 | exponential | 2 | Big claims | exponentially |
| 47 | paradigm shift | 3 | Big claims | paradigm shifts, paradigm-shifting |
| 48 | disrupt | 2 | Big claims | disrupts, disrupted, disrupting, disruptive, disruption, disruptions |
| 49 | unmatched | 2 | Big claims | None |
| 50 | unparalleled | 3 | Big claims | None |

Phase 2 tests cover case, hyphens, plurals, explicit suffixes, word boundaries, repeated occurrences, overlap precedence, and the exact denominator. For a fixture with 100 words, two weight-2 matches and one weight-3 match produce a score of 7. Tests also cover zero hits, failed pages, every bingo direction, and near-complete lines.

## Fixed bingo card

Use one versioned card for every company and the play page. Do not randomize it per company. A cell is hit when its canonical phrase has at least one accepted match. The centre is always free and adds no score.

| B | I | N | G | O |
| --- | --- | --- | --- | --- |
| AI-powered | seamless | 10x | best-in-class | unlock |
| paradigm shift | unprecedented | world-class | empower | next-generation |
| the future of | leverage | FREE | supercharge | AI-native |
| game-changing | superintelligence | revolutionize | unparalleled | industry-leading |
| frictionless | first-ever | cutting-edge | all-in-one | AI-driven |

The eight requested phrases, AI agent, agentic, copilot, scalable, robust, ecosystem, end-to-end, and multi-agent, all have weight 1. The six of those that appeared on the old card have been replaced with stronger fluff. The game-changing cell already accepts game-changer, so industry-leading fills the sixth replacement without a duplicate canonical phrase.

Store the 25 cell states and all completed line identifiers. BINGO means any complete row, column, or diagonal: twelve possible lines. Weighted score and bingo are separate measures. The original Phase 2 sample had zero individual BINGOs among 29 scored companies. The reviewed design now presents each company's **best line X/5**, including the FREE centre, plus a **cohort-wide card** whose cells show distinct-company hit counts. Repeated occurrences on one company's page count once toward a cohort cell. Unscored pages do not contribute cell hits or enter the zero-hit percentage denominator. Keep individual BINGO detection available as derived data, without relying on it as the primary company badge. Do not tune dictionary weights or card phrases toward funnier results.

## Site and sharing

The visual direction uses a cream paper background, cobalt and coral ink, bold numbered bingo balls, and a 5-by-5 grid. Keep text contrast high, mark hits with both colour and a symbol, and support keyboard focus and reduced motion. Build for a 375px phone and a wide desktop.

- `/`: top 25 scored companies for the selected week, with rank, logo or initials, name, cohort, density, top three phrases, and best-line progress X/5. Include the cohort-wide card with company counts and the comparison statistics. Controls switch between most buzzwords, "least buzzwords (the honest ones 🏆)", and category density. Show cohort coverage, week, failures, and the count ranked. Failed or insufficient pages never enter the least-buzzwords ranking.
- `/c/<slug>/`: fixed bingo card, best-line progress X/5, density breakdown, per-phrase counts, escaped text excerpts with `<mark>` highlights, scrape date, homepage link, and score history. A single-week sample says that history is not yet available. A prefilled X share intent includes the real score, company page URL, and playful company-level copy.
- `/play/`: click or keyboard-toggle cells, reset, and show completed lines. State stays in the browser. This page never fetches a visitor-supplied URL or spends scrape credits.
- `/about/`: formula, denominator and matching rules, complete versioned dictionary, source attribution, limitations, satire note, and opt-out process.
- Build-time PNGs at `/og/c/<slug>.png` plus `/og/comparison.png`: company name, bingo card, density, week, and satire label. Company pages emit absolute Open Graph and X large-image metadata. Generate the sample cards in Phase 3. Final sharing URLs use the deployment origin configured in Phase 4.

Every page visibly says **"This is satire, made with love."** Scores describe homepage wording, never people, competence, honesty, or product quality. Explain that "the honest ones" is a playful label, not a factual judgment. Excerpts stay short and link to their source.

An opt-out link opens a GitHub issue template requesting only company name and homepage. Add an exclusion record, remove the company from scores, history, pages, OG assets, and stored text, then rebuild within seven days. Check exclusions during import, crawl, score, and build so refreshes cannot restore a removed company. Explain that already cloned Git history and external share-card caches may retain old copies. The owner configured `https://github.com/mohi-devhub/buzzword-bingo/issues/new?template=company-opt-out.yml` in `data/site.json` as `OPT_OUT_URL`. `optOutRepositoryReady: true` records the owner’s confirmation that the repository has been created. No email address appears on the site. The preparation session received 404 from GitHub; verify public repository and issue-template access before deployment.

## Planned repository layout

This tree describes future work. Phase 0 creates only this plan.

```text
PLAN.md
README.md
.gitignore
.env.example
package.json
package-lock.json
tsconfig.json
astro.config.mjs
.local/                 ignored full captures and private backups
  scrapes/<ISO-week>/<slug>.json
  cache/<ISO-week>/<url-sha256>.json
data/
  companies.json
  exclusions.json
  policy.json
  samples/fall-2026-tuning.json
  cohorts/<name>.json
  sources/<name>.json
  comparisons/<ISO-week>.json
  runs/<run-id>.json
  scores/<ISO-week>.json
  scores/<ISO-week>/<cohort>.json
scripts/
  companies.ts          fetch and validate the selected YC batch
  crawl.ts              enforce cache, budget, and Context.dev calls
  score.ts              score saved results and write weekly JSON
  og.ts                 generate share PNGs from saved scores
  prepare-site.ts       copy methodology and local font licences
  verify-site.ts        check built routes, statistics, images, and public output
src/
  buzzwords.ts          dictionary and explicit match variants
  score.ts              pure matching, counts, and density
  bingo.ts              fixed card and completed-line detection
  extract.ts            markdown extraction and word tokens
  data.ts               shared record types and JSON readers
  cache.ts              URL/week lookup and atomic writes
  components/           bingo card, leaderboard, history, excerpts
  layouts/Base.astro
  pages/index.astro
  pages/c/[slug].astro
  pages/play.astro
  pages/about.astro
  pages/opt-out.astro
  pages/data/score-summary.json.ts
  site-data.ts          load frozen scores and filter exclusions
  client/               local leaderboard and play interactions
  styles/global.css
tests/
  score.test.ts
  bingo.test.ts
  cache.test.ts
  fixtures/
public/
  fonts/
  logos/
  og/comparison.png
  og/c/<slug>.png
.github/
  ISSUE_TEMPLATE/company-opt-out.yml
  workflows/deploy.yml
```

Keep files focused and add each authored file's two-line purpose-and-reason header using its native comment syntax. Markdown uses an HTML comment, as above. Strict JSON cannot contain comments: JSON data files use a first `_meta` object with the same two header strings and schema version, keeping the requested valid JSON format. Dependency-generated lockfiles and binary assets use format-supported metadata where possible; do not corrupt their formats to prepend comments.

## Phase gates and review evidence

1. **Phase 0, stop here.** Deliver this verified plan, the 50-phrase draft, card layout, credit estimate, and proposed structure. Wait for your approval before installing dependencies or writing code.
2. **Phase 1, then stop.** Set up secrets protection, inspect the installed SDK, import the YC list, and crawl only the selected ten companies. Save real text and failure reasons. Show stored text for three successful results, or report if fewer than three succeeded. Print the credit accounting and run the same command again to prove zero new requests. Do not buy replacement attempts to hide failures.
3. **Phase 2, then stop.** First expand the pinned sample to thirty companies within the approved twenty new requests, keeping the original ten cached. Implement pure scoring, bingo, and unit tests. Show the top ten with per-phrase counts, bottom five, two real highlighted excerpts, and ten most-hit phrases with total counts and company coverage. Report scored and unscored counts, the sample BINGO percentage against the below-about-20% target, and actual credits used. Verify reproducible output and wait for dictionary tuning. No further scrape spend is authorized.
4. **Phase 3, then stop.** Build all site pages and share cards from the approved sample. Verify leaderboard controls, playable cells, share URLs, metadata, history's empty state, and the static build. Show home and one company page at desktop and mobile widths, plus a focused comparison-section capture, five screenshots total. No additional scrape spend. AI remains disabled.
5. **Phase 4, then stop.** Only after explicit approval of the fresh credit estimate, run the full batch. Add weekly automation, deployment configuration, README instructions, and three launch drafts: a funny leaderboard reveal, the honest-ones angle, and a methodology thread. Every statistic comes from saved generated data. Report the full-run credits, build result, deploy readiness, and any owner setup still required.

The pre-push revision removes scheduled collection and all GitHub-side re-scoring. Manual local tools retain monthly cadence and credit checks. The public request ledger also prevents repeat requests in a fresh clone with no local payloads. Missing local text makes re-scoring fail before replacing public results. Back up `.local/` privately.

GitHub Pages is prepared for `https://mohi-devhub.github.io/buzzword-bingo/`, base `/buzzword-bingo/`. Its only workflow is manually dispatched and builds the committed public snapshot without keys or local captures. Deployment requires `DEPLOY_ENABLED=true`; `AUTOMATION_ENABLED` remains false. The opt-out repository and issue template must be publicly accessible before deployment. No GitHub operations are performed by the coding agent. Follow PUSH.md.

The optional "Translate to human" feature is outside these phases unless you approve it after Phase 3. It would use only the `.env` OpenAI key, cache by company, input text hash, prompt version, and model, and never enter counts, scores, bingo, or rankings. No LLM calls are planned or budgeted now.
