# Data schema

All dashboard content lives in `data/*.json`. The page (`assets/app.js`) renders whatever these files contain, so the schema is the contract between the monthly research task and the site. `scripts/validate-data.mjs` enforces the rules marked **required**.

## `meta.json`

| Field | Required | Meaning |
|---|---|---|
| `name`, `tagline` | yes | Site name and one-line description |
| `edition` | yes | Edition label, for example `"September 2026"`; must match `briefing.edition` |
| `generatedAt` | yes | ISO date the edition was compiled |
| `nextScheduledRun` | yes | ISO date of the next scheduled refresh |
| `cadence` | yes | Sentence describing the refresh cadence |
| `repo` | yes | Repository URL |
| `schemaVersion` | no | Integer, bump on breaking schema changes |

## `sources.json`

An object keyed by a short stable id (`snake_case`, ASCII). Each value: `org` (publisher), `title` (exact title), `date` (ISO `YYYY-MM-DD` or `YYYY-MM`), `url` (https). Every `source` reference elsewhere must resolve to a key here.

## Section files (`overview.json`, `ai.json`, `math.json`)

```
{
  "section": "overview" | "ai" | "math",
  "eyebrow": string,          // small label above the title
  "title": string,
  "lede": string,             // 2–4 sentence synthesis
  "kpis": Stat[6],            // headline tiles (layout expects six)
  "blocks": Block[]
}
```

### Stat

| Field | Required | Meaning |
|---|---|---|
| `id` | no | Stable id |
| `label` | yes | What the number is, sentence case, no trailing colon |
| `value` | no | Numeric value (used for validation and future charts) |
| `display` | yes | The string shown, already formatted (`"22.6%"`, `"$74,495"`, `"35 + PR"`) |
| `unit` | no | Population or scale shown under the value |
| `delta` | no | `{ "text": "−8 vs 2019", "sentiment": "good" | "bad" | "neutral" }`; sentiment is from the student's point of view |
| `asOf` | no | Data year or survey window |
| `source` | yes | Key in `sources.json` |
| `note` | no | One or two sentences of context; may mention the previous value |

### Block

Every block has `type`, `size` (`sm`=2, `md`=3, `lg`=4, `full`=6 of a six-column grid; consecutive blocks should fill rows) and, except charts, a `title` and optional `subtitle`.

- `chart`: `{ "type": "chart", "id": string, "size": ..., "chart": Chart }`
- `stats`: `{ "type": "stats", "title", "items": Stat[] }`
- `findings`: `{ "type": "findings", "title", "items": [{ "headline", "detail", "source" }] }`
- `chips`: `{ "type": "chips", "title", "items": [{ "label", "display", "note", "source" }] }`
- `table`: `{ "type": "table", "title", "subtitle", "columns": string[], "rows": [{ "cells": string[], "source" }] }`

### Chart

Common fields: `kind`, `title`, `subtitle`, `unit`, `format` (`percent` | `currency` | `int` | `float1` | `M`), `source`, `note`.

| kind | Fields |
|---|---|
| `line` | `x: string[]`, `series: [{ name, values: number[] }]`, optional `yDomain: [min,max]`, `baseline: { value, label }`, `marker: { x, label }`, `height` |
| `multiples` | `x`, `panels: [{ name, values }]`, optional `marker`; one small line chart per panel |
| `bars` | `items: [{ label, value, group?, source?, display? }]`, optional `reference: { value, label }`, `xDomain`; horizontal bars, colored by `group` when present |
| `dumbbell` | `items: [{ label, a, b }]`, `aLabel`, `bLabel`, optional `xDomain` |
| `stack` | `segments: [{ label, value, neutral? }]` summing to ~100, optional `companion: [{ label, display }]` |

Rules: arrays stay aligned and chronological; values are numbers, never strings; keep a series to at most three named lines; when two series come from different surveys say so in the subtitle and give each bar its own `source`.

## `briefing.json`

| Field | Required | Meaning |
|---|---|---|
| `edition` | yes | Matches `meta.edition` |
| `generated` | yes | ISO date |
| `summary` | yes | Three-sentence synthesis of the month |
| `items` | yes | Newest first: `{ date, tag: "AI"|"Math"|"Data"|"Policy", headline, detail, source }` |
| `upcoming` | yes | `{ date (YYYY-MM or YYYY-MM-DD), what, why, source? }` |
| `changelog` | yes | `{ edition, date, changes: string[] }` |
