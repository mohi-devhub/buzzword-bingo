<!-- Records the product decisions already confirmed through the phase reviews.
Keeps the interface grounded in the user's approved scope and real data. -->

# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Astro static output, Node 22, TypeScript, committed JSON, build-time share images. Local preview through the Phase 4 release gate. GitHub Pages is prepared for https://mohi-devhub.github.io/buzzword-bingo/.

## Users and purpose

Visitors compare startup language across recent YC companies and public cloud companies, inspect the evidence for each score, and share the result on X. The tone is playful and kind. Companies are the subject, never individuals.

## Confirmed constraints

The home page leads with cohort median density, zero-hit percentages, and the agentic company-share comparison (fraction and percentage); raw mentions are secondary. Tabs expose most and least buzzwords for both cohorts. Both cohort cards count companies per phrase. Company pages show best-line progress, counts, excerpts, and honest history states. Play and About pages are required.

Every result comes from saved score JSON. The full pinned Fall 2026 YC batch replaces the tuning sample in Phase 4. The public-cloud cohort remains a systematic sample. The dictionary, weights, matching, and card layout are frozen. The full crawl is authorized within a cumulative cap of 300 credits. Prepare automation and deployment, but do not push or deploy publicly before the Phase 4 review. No LLM calls.

## Brand commitments

Buzzword Bingo. The approved plan specifies bingo-hall energy, cream paper, cobalt and coral, bold typography, mobile support, a visible satire note, and an opt-out path. Preserve readability and accessible controls.

## Evidence and unresolved setup

The repository contains two frozen cohorts, source provenance, captures, and scores under `data/`. `COMPARISON.md` explains selection. There is one scored week, so do not invent a history graph. The owner supplied `https://github.com/mohi-devhub/buzzword-bingo/issues/new?template=company-opt-out.yml` and has confirmed creation of that public repository. Keep the URL configurable, set optOutRepositoryReady true, and never add an email address. GitHub returned 404 during preparation, so verify public access before deployment. The public origin is https://mohi-devhub.github.io/buzzword-bingo/.

## Pre-push publication boundary

Full text and markdown remain in the ignored .local/ store. Public scores contain counts, source hashes, and only displayed short evidence. The static build works without .local/ or .env. Re-crawls and re-scoring run manually and locally; no scheduled crawl workflow ships. AUTOMATION_ENABLED stays false, with only 25 approved credits left versus about 275 for a combined monthly refresh. The owner performs all GitHub creation, push, Pages, variable, and opt-out verification steps in PUSH.md.
