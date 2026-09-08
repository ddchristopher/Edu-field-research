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

An object keyed by a short stable id (`snake_case`, ASCII). Each value: `org` (publisher), `title` (exact title), `date` (ISO `YYYY-MM-DD` or `YYYY-MM`), `url` (https). Every `source` reference elsewhere must resolve to a key here. A `source` field may be a single key or an array of keys when a claim draws on two documents (for example a state test release and its companion end-of-course release); list the primary document first.

## Section files (`overview.json`, `models.json`, `ai.json`, `math.json`, `conditions.json`)

```
{
  "section": "overview" | "models" | "ai" | "math" | "conditions",
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
- `table`: `{ "type": "table", "title", "subtitle", "columns": string[], "rows": [{ "cells": string[], "tier"?, "source" }] }`. A row's optional `tier` renders as a pill in its own column, placed after the cells and before the source; count it in `columns`.

### Chart

Common fields: `kind`, `title`, `subtitle`, `unit`, `format` (`percent` | `currency` | `int` | `float1` | `M`), `source`, `note`.

| kind | Fields |
|---|---|
| `line` | `x: string[]`, `series: [{ name, values: number[] }]`, optional `yDomain: [min,max]`, `baseline: { value, label }`, `marker: { x, label }`, `height` |
| `multiples` | `x`, `panels: [{ name, values }]`, optional `marker`; one small line chart per panel |
| `bars` | `items: [{ label, value, group?, source?, display? }]`, optional `reference: { value, label }`, `xDomain`; horizontal bars, colored by `group` when present |
| `dumbbell` | `items: [{ label, a, b }]`, `aLabel`, `bLabel`, optional `xDomain` |
| `stack` | `segments: [{ label, value, neutral? }]`, optional `companion: [{ label, display }]`. Percent stacks must sum to ~100; set `format: "int"` to stack raw counts instead, which are drawn proportionally |

Rules: arrays stay aligned and chronological; values are numbers, never strings; keep a series to at most three named lines; when two series come from different surveys say so in the subtitle and give each bar its own `source`.

## `briefing.json`

| Field | Required | Meaning |
|---|---|---|
| `edition` | yes | Matches `meta.edition` |
| `generated` | yes | ISO date |
| `summary` | yes | Three-sentence synthesis of the month |
| `items` | yes | Newest first: `{ date, tag: "AI"|"Math"|"Data"|"Policy"|"Funding", headline, detail, implication?, source }`. The optional `implication` is one sentence on what the item means for a school-model portfolio; it renders in a visibly separate rule so interpretation never reads as quoted data |
| `upcoming` | yes | `{ date (YYYY-MM or YYYY-MM-DD), what, why, source? }` |
| `changelog` | yes | `{ edition, date, changes: string[] }` |

## The school models section (`models.json`)

The heart of the dashboard, and the section with the strictest rules. It **ranks nothing**: effect
sizes come from different outcomes, grades and populations, so they are never sorted against each
other or combined into a score.

- **Proven lane** holds school models evaluated by admissions lottery or matched comparison, at
  more than one site. `tier` is the evidence design: `Lottery`, `Randomized`, `Quasi-experimental`
  or `Contested`.
- **New designs lane** holds models being funded or grown ahead of independent evidence. The third
  cell must name the evidence that would settle the question. `tier` is a status: `Self-reported`,
  `Too early`, `Unmeasured` or `Measured`.

Attribute an operator's own results to the operator, in the row text, every time. Never present a
self-reported figure as a finding. Where a claim is contested, cite both sides in the same row.

## The conditions section (`conditions.json`)

Covers what lets a good model open, measure itself and be judged: accountability policy, the data
and evidence infrastructure, and the capital flowing into new schools. Its last block is a standing
"where the field disagrees" list; keep it populated, and retire an entry only when the disagreement
is actually resolved rather than when it becomes inconvenient.
