<!-- Explains the public static snapshot, private capture store, and manual refresh process.
Keeps full homepage payloads local while making a fresh public checkout buildable. -->

# Buzzword Bingo

A friendly bingo hall for ambitious company homepage language. Compare the full pinned YC Fall 2026 batch with a systematic public-cloud sample, inspect the short evidence behind each score, or play your own round.

**This is satire, made with love.** Scores describe homepage wording, never people, honesty, or product quality. Companies can [request removal](https://github.com/mohi-devhub/buzzword-bingo/issues/new?template=company-opt-out.yml); requests are processed within a week.

[PHASE4.md](PHASE4.md) records full-batch results and receipts. [COMPARISON.md](COMPARISON.md) explains selection. [LAUNCH.md](LAUNCH.md) contains the three unposted drafts. **Nothing has been pushed or deployed by the coding agent.**

## Build a public checkout

Requires npm and Node 22.23.4 or newer. npm scripts use the pinned local Node binary.

```sh
npm ci
npm run verify:public
npm run check
npm test
npm run build
npm run verify:site
npm run preview
```

Open `http://127.0.0.1:4321/buzzword-bingo/`. Astro writes static files to `dist/`; there is no server or database. The build reads **only committed public data and installed dependencies**. It needs neither `.env` nor `.local/` and never crawls or re-scores.

The default origin is `https://mohi-devhub.github.io/buzzword-bingo/`, base `/buzzword-bingo/`. Non-secret `BINGO_SITE_URL` and `BINGO_BASE` override those at build time. `npm run dev` uses the same base path.

## Public data and private captures

Committed data includes company/source metadata, scoring rules, scores, word counts, SHA-256 hashes of normalized source text, credit receipts, and the short evidence actually displayed on company pages. Each scored company has at most two twelve-word excerpts and the first matched variant shown beside each phrase count. Excerpt highlights use offsets within that short excerpt. Whole-page match lists are not published.

Full extracted text, rendered markdown, title/description metadata, and canonical URL/week cache records live only in **gitignored `.local/scrapes/` and `.local/cache/`**. The old `data/scrapes/` and `data/cache/` locations are ignored too. Back up `.local/` privately; do not upload it, a private history bundle, or `.env` to GitHub or workflow artifacts.

`npm run verify:public` checks tracked paths and reachable Git history, public score schemas, data fields, and workflow contents. The unpublished development history was replaced with a clean public snapshot, so the first push cannot carry the old full captures through earlier commits.

The request ledger remains public to account for the 275 credits already used. If a public clone lacks full text, the crawler still recognizes previously attempted URLs from those receipts and refuses duplicate requests. Re-scoring without the necessary local captures fails before replacing reviewed public scores. Restore the private store instead of downloading those pages again.

## Scoring and fairness

**Density = weighted phrase hits / homepage word count × 100.** Matching uses the frozen dictionary, explicit variants, word boundaries, and longest-overlap rules. No LLM affects scores. Pages under 50 extracted words, failed captures, and unavailable pages stay unscored.

Medians and zero-hit percentages use scored pages only. The primary “agentic” comparison is the share of scored companies using it at least once; raw mentions are secondary. Both cohorts use identical rules and bingo cards. A cohort cell counts distinct companies once; company pages show best-line progress and exact phrase counts.

This is a descriptive comparison of saved homepage wording. The community YC list may omit unlaunched companies, and the public-cloud group is a systematic sample. A zero score does not prove honesty; a high score does not imply a bad product.

## Refresh manually and locally

**AUTOMATION_ENABLED stays false at launch. There is no scheduled crawl or re-scoring workflow.** GitHub Actions only builds and optionally deploys the committed static snapshot. Do not add a Context.dev or OpenAI secret to GitHub.

Only **25 approved credits remain**. Refreshing both cohorts would require about **275 new credits**: approximately 225 YC and 50 public-cloud homepages. That requires a new explicit budget approval and policy update before any paid run. Lifetime authorization does not reset monthly. `data/policy.json` still caps lifetime requests and credits at 300, with a separate 1,000-credit monthly ceiling.

For local scoring from the existing private store, with zero provider requests:

```sh
npm run score
npm run score -- --cohort bvp-established
npm run compare
npm run report:phase4
npm run build
npm run verify:site
npm run verify:public
```

Review and commit only the updated public data. The full text stays in `.local/`. The original tuning selection remains available through `--sample fall-2026-tuning`; do not publish tuning scores in place of the full batch.

For a future approved crawl, put `CONTEXT_DEV_API_KEY` only in the ignored root `.env` using `.env.example`. The verified Context.dev SDK, JS-rendered markdown extraction, and retry policy remain unchanged. No OpenAI key is used.

The crawl defaults to `--limit 10`; cached companies count toward that limit. Ordinary runs reuse earlier attempts, including failures and interrupted requests. A re-crawl requires `--refresh`, only on the first Monday of the month UTC, and cannot repeat an attempt from the current week or month. Every crawl prints actual credits or explicitly labelled conservative estimates. `npm run refresh` is a **local manual** helper that considers whole-cohort affordability and cadence; it cannot run in GitHub Actions. It does not raise its own allowances.

Preserve `data/runs/` and the private cache. Remove `.crawl.lock` only after confirming that no crawl is running. A pending attempt is never deleted to force a retry.

## Publish yourself

Follow [PUSH.md](PUSH.md) for the exact public-repository, first-push, opt-out, Pages, and variable steps. The coding agent does not perform them.

[pages.yml](.github/workflows/pages.yml) has a manual trigger and no crawl credential. Its deployment job requires repository variable `DEPLOY_ENABLED=true` and checks that the public opt-out repository and issue template exist. Setting the variable alone does not deploy: run **Actions → GitHub Pages → Run workflow** yourself. Keep `AUTOMATION_ENABLED=false`.

## Process an opt-out within a week

`data/site.json` configures the GitHub issue destination and `optOutRepositoryReady: true`. The template requests only company name and homepage. No email address appears on the site.

1. Add the company ID and normalized homepage URL to `data/exclusions.json`.
2. Remove its private captures from `.local/scrapes/` and `.local/cache/`, public scores and excerpts from every saved week, then regenerate comparison summaries. Preserve credit receipts for accounting.
3. Rebuild to remove company routes, history, public exports, and share images. Verify the public output, commit the removal, and run the Pages workflow within seven days.

Old Git clones and externally cached share cards may retain previous public excerpts. Full captures are never part of the public repository.
