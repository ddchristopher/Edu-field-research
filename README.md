# Chalkline

A monthly, sourced dashboard of U.S. K-12 education built for one reader: a program director at an evidence-driven funder who invests in **scaling proven school models** and **building evidence on new school designs**, including schools built around AI. Every figure links to its primary source, every chart has a keyboard-readable table view, and the whole thing is refreshed by a scheduled research task on the first of each month.

- Site: `index.html` (deployed to GitHub Pages from the repository's default branch by `.github/workflows/deploy-pages.yml`; the same build also publishes `offline.html`, a single-file bundle)
- Data: `data/*.json` (see `research/SCHEMA.md`); the school-models register lives in `data/models.json` and ranks nothing by design
- Routine prompt history: `research/routine-prompts/` keeps every version of the monthly task's prompt, with the dates it was in effect
- Research protocol: `research/MONTHLY_RESEARCH_TASK.md`

## What is on the page

| Section | Contents |
|---|---|
| The landscape | The diagnosis: unrecovered achievement, widening gaps at the bottom, falling enrollment, and a federal measurement apparatus being reorganised |
| School models | The portfolio. A proven lane of models with lottery or matched-comparison evidence, and a new-designs lane of AI-first schools, microschools and partnerships with the evidence that would settle each |
| AI and learning | The two separable bets: AI as a tool inside conventional schools, which has evidence, and AI as the core of a school design, which does not |
| Academic foundations | What any model has to move: math and reading outcomes, proven in-school interventions, and durable skills |
| Conditions for scale | Accountability, data infrastructure, capital flows, and a standing list of where the field disagrees |
| The month in brief | Three-sentence synthesis of the edition |
| This month | Dated ledger of releases, policy and funding moves, each with a labelled implication for the portfolio, plus upcoming releases and the edition changelog |
| Sources and method | Selection rules, how to read the figures, cadence, and the full source table |

## One-time setup: turn on GitHub Pages

The deploy workflow cannot enable Pages itself (creating a Pages site needs
`Administration: write`, which the workflow's `GITHUB_TOKEN` never has). An admin
turns it on once:

1. Open <https://github.com/ddchristopher/Edu-field-research/settings/pages>
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Re-run the latest **Deploy to GitHub Pages** run, or push any commit.

The site then publishes to <https://ddchristopher.github.io/Edu-field-research/>
on every push to the default branch. Until Pages is on, the deploy run fails at
`actions/configure-pages` with "Get Pages site failed"; the build steps before it
(validation and bundling) still pass.

## Running locally

The page fetches `data/*.json`, so serve the folder rather than opening the file directly:

```bash
npx serve . -l 8080        # or: python3 -m http.server 8080
open http://localhost:8080
```

Or build the single-file bundle, which works from disk:

```bash
node scripts/build-single.mjs   # writes dist/index.html
```

Validation and visual QA:

```bash
node scripts/validate-data.mjs           # schema, source references, series lengths, row layout
node scripts/validate-data.mjs --links   # also HEAD-checks every source URL
npm i -D playwright && npx playwright install chromium
node scripts/screenshot.mjs http://localhost:8080/ qa   # light/dark, desktop/tablet/mobile screenshots
```

## The monthly research task

Two schedulers are supported; the first is on by default.

1. **Claude Code Routine (default).** A routine in the repository owner's Claude account fires on the first of each month at 13:00 UTC, opens a fresh session, attaches this repository and follows `research/MONTHLY_RESEARCH_TASK.md`: scan the release calendar, verify new figures against primary sources, update `data/`, run the validator and screenshots, and open a pull request titled `Monthly research: <Month YYYY>`. A person reviews and merges; merging to the default branch deploys the site.
2. **GitHub Actions (optional).** `.github/workflows/monthly-research.yml` runs the same protocol with `anthropics/claude-code-action` on the same schedule. It exits quietly unless an `ANTHROPIC_API_KEY` repository secret exists and Actions are allowed to create pull requests. Use one scheduler or the other to avoid duplicate PRs.

Either way the contract is the same: the task edits JSON only, never the page code, and nothing reaches the dashboard without a primary source, a date and a note about definitions.

## Design notes

- Vanilla HTML, CSS and JavaScript; no build step is required to run the page. Charts are hand-drawn SVG (`assets/charts.js`) that follow a fixed spec: 2px lines, bars no thicker than 18px with rounded data ends, hairline solid gridlines, direct labels only where they matter, a crosshair tooltip on lines and per-mark tooltips on bars, arrow-key navigation, and a table view for every chart.
- Colors are a validated categorical palette (blue, orange, aqua) with a section accent per part of the page (blue for the landscape, violet for AI, orange for math). The palette passed color-vision-deficiency and contrast checks in both themes; light and dark themes are designed separately, not inverted.
- Type: Newsreader for display and the monthly synthesis, Public Sans for interface and numbers. Both load from Google Fonts with system fallbacks.

## Deploying

Set GitHub Pages to **Source: GitHub Actions** (Settings → Pages; see the one-time
setup section above). Every push to the repository's default branch (or a manual run of the deploy workflow) validates the data, builds the bundle and publishes `index.html`, `assets/`, `data/` and `offline.html`. The repository was created empty, so its default branch is currently `claude/k12-education-dashboard-tp4rxq`; if you rename or switch the default to `main`, nothing else needs to change.

## License

MIT for the code. Data files quote published statistics with attribution to their publishers; see `data/sources.json`.
