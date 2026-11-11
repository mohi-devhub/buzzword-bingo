---
# Records the implemented Buzzword Bingo visual system and reusable tokens.
# Keeps future screens consistent with the approved bingo-hall world.
name: Buzzword Bingo
description: Cream-paper score sheets, bold lettering, and kind satire.
colors:
  paper: "#f8f5ec"
  sheet: "#fffdf8"
  ink: "#24241f"
  muted: "#66665c"
  line: "#d8d5c9"
  coral: "#ed6347"
  coral-light: "#fbede4"
  blue: "#3046cf"
  blue-light: "#e8ebfb"
  green: "#466335"
  green-light: "#e8efda"
typography:
  display:
    fontFamily: '"Barlow Condensed", sans-serif'
    fontSize: "clamp(4rem, 7vw, 6rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.015em"
  headline:
    fontFamily: '"Barlow Condensed", sans-serif'
    fontSize: "clamp(2rem, 4vw, 3.25rem)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.015em"
  title:
    fontFamily: '"Barlow Condensed", sans-serif'
    fontSize: "1.6rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.015em"
  body:
    fontFamily: '"Public Sans", sans-serif'
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: '"Public Sans", sans-serif'
    fontSize: "12px"
    fontWeight: 600
rounded:
  surface: "16px"
  button: "8px"
  cell: "5px"
  tag: "4px"
spacing:
  card-inset: "12px"
  section: "80px"
  section-mobile: "52px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.button}"
    padding: "11px 20px"
  button-primary-hover:
    backgroundColor: "{colors.blue}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.button}"
    padding: "11px 20px"
  button-light:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.button}"
    padding: "11px 20px"
  comparison-card:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
  bingo-card:
    backgroundColor: "{colors.coral}"
    rounded: "{rounded.surface}"
    padding: "{spacing.card-inset}"
  phrase-tag:
    textColor: "{colors.ink}"
    rounded: "{rounded.tag}"
    padding: "3px 6px"
---

# Design System: Buzzword Bingo

## Overview

**Creative North Star: "The Bingo Hall Score Sheet"**

Cream paper, numbered balls, confident condensed lettering, and ruled score sheets make the data feel like a friendly public game. Humor stays kind; clear counts and readable evidence carry the interface.

**Key Characteristics:**

- Warm paper with coral and cobalt cohort identities.
- Bold display lettering beside compact, practical reading text.
- Flat bordered surfaces, real bingo grids, and explicit control states.

## Colors

Warm neutrals hold the reading surface; cohort colors make comparisons easy to follow.

### Primary

- **Bingo Coral** (`coral`): startup markers, card frames, headline punctuation, and the occasional broad callout. **Coral Wash** (`coral-light`) supports startup score panels.

### Secondary

- **Scoreboard Cobalt** (`blue`): incumbent markers, card frames, links on hover, and keyboard focus. **Cobalt Wash** (`blue-light`) supports incumbent score panels.

### Tertiary

- **Quiet Green** (`green`) and **Green Wash** (`green-light`): zero-hit numbers and empty-result messaging.

### Neutral

- **Cream Paper** (`paper`): page ground; **Fresh Sheet** (`sheet`): cards and selected controls.
- **Printing Ink** (`ink`): text and structural rules; **Pencil Gray** (`muted`): supporting context; **Paper Rule** (`line`): quiet dividers.

**The Cohort Identity Rule.** Coral identifies startups and cobalt identifies incumbents wherever cohort identity is shown. Pair color with a name, count, or marker.

## Typography

Barlow Condensed supplies display, headline, title, bingo lettering, and large scores. Public Sans supplies reading text, labels, tables, and controls. Both are locally bundled; fallback is sans-serif.

Use the frontmatter hierarchy as the baseline. Headings are tight and balanced; prose allows up to (72ch). Scores use tabular numerals. Table labels are compact uppercase Public Sans; ordinary navigation and buttons retain sentence case. Mobile body text becomes (14px), while display sizes adapt by surface.

## Layout

The centered shell caps at (1200px), with (48px) desktop gutters, (32px) below (1100px), and (18px) below (540px). Sections use the frontmatter rhythm. Grids use flexible zero-minimum columns to contain long content.

Comparison scoreboards retain two cohort columns on mobile. Paired bingo cards and company detail columns become a single column below (800px). Below (540px), company scores move under the title, controls wrap, and the leaderboard prioritizes rank, company, and density; best-line progress moves into the company subtitle. Keep contextual labels beneath company titles rather than adding decorative text above them.

## Elevation & Depth

Surfaces have no shadows. Cream and fresh-sheet tones, thin rules, colored frames, and selected fills establish depth. Buttons change fill on hover; playable bingo cells alone rise slightly. Most transitions last (150ms), use ease-out, and respect reduced-motion preferences.

**The Printed Surface Rule.** Use borders and tonal separation for hierarchy; preserve the flat score-sheet material.

## Shapes

Large surfaces use the surface radius; buttons use the smaller button radius. Bingo cells and phrase tags use compact corners. Balls are circles; progress badges are pills. Tables use thin horizontal rules instead of enclosing every cell.

## Components

- **Buttons:** confident, compact Public Sans with a minimum height of (45px). Primary ink changes to cobalt on hover; outlined secondary changes to fresh sheet; light changes to coral wash. Keyboard focus uses a cobalt outline (3px) offset (5px).
- **Navigation:** a condensed wordmark with a numbered coral ball; compact text links turn cobalt on hover. Mobile removes the redundant rankings link and provisional pill while retaining Play and methodology access.
- **Tabs and sorting:** selected cohort tabs join the sheet through an ink border and fresh-sheet fill. Sort controls use a pale neutral track and a fresh-sheet selected segment. State remains explicit through ARIA attributes.
- **Fields:** category selects use a transparent fill, quiet rule, and gently rounded corners (6px); use the shared visible focus treatment.
- **Tags and badges:** phrase tags have thin neutral borders; no-hit tags use green wash and green text. Progress badges use paper, a quiet border, and explicit best-line counts.
- **Comparison cards:** fresh-sheet outer frame, ink rules, and adjacent cohort washes. Large tabular scores lead; units and coverage remain nearby.
- **Bingo cards:** a five-column colored frame with five-column letter row; inset cells show phrase text, a count/status, and an SVG check for hits. FREE is dark. Mobile keeps all five columns and reduces frame padding to (8px).
- **Evidence cards:** fresh-sheet fill, quiet border, surface corners, and generous reading space. Highlight counted text; keep source links visible.

## Do's and Don'ts

### Do:

- **Do** preserve coral/cobalt cohort mapping and pair color with readable labels.
- **Do** use real bingo grids, numbered balls, and ruled sheets as the visual vocabulary.
- **Do** keep controls keyboard-visible and provide text alongside score and hit states.
- **Do** wrap long company names and keep mobile comparisons readable.

### Don't:

- **Don't** add ambient shadows to flat paper surfaces.
- **Don't** replace bundled display lettering or SVG control icons with system faces or text glyphs.
- **Don't** let visual humor obscure counts, units, evidence, or the kind satire note.
