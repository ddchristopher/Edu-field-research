# Chalkline monthly research task

This is the protocol the scheduled research agent follows on the first of every month (13:00 UTC) and whenever it is run by hand. The output is a pull request that updates the JSON files in `data/` so the dashboard reflects the latest U.S. K-12 research, data, trends and findings, with special attention to AI in education and math education.

The task is deliberately conservative: **a number that cannot be traced to a primary source does not go on the dashboard.** When in doubt, keep the previous figure and note its date.

## 0. Setup

1. Clone the repository (default branch) and create a branch named `research/YYYY-MM` for the edition month.
2. Read `research/SCHEMA.md`, `data/meta.json`, `data/briefing.json` and the three section files (`overview.json`, `ai.json`, `math.json`) so you know what is already on the dashboard and its `asOf` dates.
3. Run `node scripts/validate-data.mjs` to confirm the starting state is clean.

## 1. Scan the release calendar

Check each recurring source for anything published since the previous edition's `generatedAt`. Typical timing is given so you know where to look hardest.

| Source | What | Typical timing |
|---|---|---|
| NCES / NAGB (nationsreportcard.gov, nagb.gov) | NAEP main assessments, long-term trend, science, civics | Jan (main), Sept (grade 12 / science); NAEP 2026 due early 2027 |
| NCES | Condition of Education, Digest tables, enrollment and teacher counts, graduation rates (ACGR), school finance (NPEFS) | May (COE), rolling |
| U.S. Census Bureau | Annual Survey of School System Finances (per-pupil spending) | May |
| NCES / IEA / OECD | TIMSS (4-year), PISA (3-year; PISA 2025 results Sept 8, 2026), PIRLS | Dec / Sept |
| AEI Return to Learn Tracker | State and district chronic absenteeism; annual report | Rolling; report June |
| FutureEd, Bellwether, Reason Foundation | Enrollment declines, closures, choice landscape | Rolling |
| NEA | Educator pay data, starting salaries | April |
| Learning Policy Institute | Teacher shortage scans (national and by subject) | Spring / summer |
| RAND (American Teacher, Principal, School District and Youth Panels) | Teacher well-being, AI use, absenteeism, student AI use | June (SoAT), rolling for AI |
| Gallup / Walton Family Foundation | Teacher AI use and guidance; K-12 satisfaction; Gen Z | Rolling; K-12 satisfaction Sept |
| Pew Research Center | Teens and AI, teens and technology | Winter / rolling |
| Common Sense Media | AI census, AI companions, risk assessments | Rolling |
| Center for Democracy & Technology | AI, deepfakes and surveillance in schools (teacher, parent, student surveys) | Fall |
| EdWeek Research Center and trackers | AI literacy surveys; science-of-reading and math policy trackers; cellphone policy | Rolling |
| NWEA, Curriculum Associates, Renaissance | MAP Growth and i-Ready recovery and growth reports | Feb, July/Aug, fall |
| Education Scorecard (Harvard CEPR / Stanford EOP) | District-level recovery | Spring |
| NCSL, ExcelinEd, FutureEd, PIE Network, AI for Education, MultiState | State legislation trackers: phones, AI, chatbots, math, reading | Rolling; sessions Jan–June |
| U.S. Department of Education, White House, Congress, courts | Budget and appropriations, reorganization and interagency agreements, executive orders, guidance, litigation | Rolling; FY deadline Sept 30 |
| College Board, ACT | AP participation (summer), SAT (Sept), ACT (Oct) | Summer / fall |
| CDC | Youth Risk Behavior Survey (biennial) | Summer of even years |
| NBER, EdWorkingPapers, arXiv, journals | Rigorous studies of AI tutoring, high-dosage tutoring, math interventions | Rolling |
| State education agencies | Spring assessment results (Texas, Florida, Mississippi, Louisiana, Tennessee, California, etc.) | June–September |
| Large districts (NYC, LAUSD, Chicago, Miami-Dade, Houston) | AI, phone and screen policies; closures | Rolling |
| Major AI vendors (OpenAI, Google, Anthropic, Microsoft, Khan Academy) | K-12 product launches, pricing, safety changes | Rolling |

Use web search with queries of the form `"<source>" <topic> <current year>` and open the primary page. Trade press (Education Week, K-12 Dive, Chalkbeat, The 74, Hechinger) is useful for discovery and for tracker counts, but quote the primary source when it is public.

## 2. Research protocol (all three sections)

For every candidate fact, capture:

- the exact figure as published (do not round beyond the source; keep the unit);
- the population and geography it describes (for example "public K-12 teachers", "teens 13–17", "45 states with 2025 data");
- the survey window or data year and the publication date;
- the primary URL (a PDF or press release on the publisher's own domain beats a news story);
- any definitional caveat (changed question wording, different sample, rounding rules).

Cross-check every number that arrives via a secondary report against the primary source before using it. If the primary is paywalled or unavailable, cite the secondary source explicitly and say so in the note.

Replace a dashboard figure only when the new one is (a) from the same or a more authoritative source and (b) more recent. When you replace a figure, mention the previous value in the note if the change itself is newsworthy ("down from 23.5%").

Section checklists:

**Overview.** NAEP (any grade or subject), chronic absenteeism, enrollment and closures, teacher pay and shortages, teacher well-being, per-pupil spending and federal budget, Department of Education reorganization, school choice programs and the federal tax credit, homeschooling, state policy counts (phones, reading, math, AI), public opinion (PDK, Gallup), student well-being (YRBS), graduation rates, recovery studies (NWEA, Curriculum Associates, Education Scorecard).

**AI in education.** Student use (Pew, RAND, Common Sense, CDT), teacher use and guidance (Gallup/WFF, RAND, EdWeek), district policy and training, learning-outcome studies (RCTs first, then quasi-experimental; record effect sizes and designs), integrity and detection, safety (companions, deepfakes, chatbot laws), federal actions (executive orders, task force, Presidential AI Challenge, ED guidance), state laws and guidance counts, large-district policies, vendor moves that change what students or teachers can access.

**Math education.** NAEP and TIMSS/PISA math (averages and percentiles), achievement-level shares, recovery in math versus reading, state numeracy laws (EdWeek tracker categories and counts), Algebra I access and automatic enrollment, AP Precalculus/Calculus participation, tutoring evidence, AI-in-math studies, math teacher shortages and professional development, attitudes toward math, major philanthropic or federal math initiatives, notable state results (for example Texas STAAR).

## 3. Update the data files

Follow `research/SCHEMA.md` exactly. In order:

1. `data/sources.json`: add a source entry for every new citation (short stable key, organization, exact title, ISO date, URL). Do not delete sources still cited.
2. Section files: update `kpis` values, `display`, `delta`, `asOf`, `note` and `source`; extend chart series by appending new x labels and values (keep arrays aligned); revise or replace `findings`, `stats`, `chips` and `table` items. Keep block `size` values so that each row of blocks still sums to six columns (sm=2, md=3, lg=4, full=6).
3. `data/briefing.json`: set `edition` to the new month; rewrite `summary` (three sentences, the month's most important developments across the three sections); add new `items` newest first (each with `date`, `tag` in {AI, Math, Data, Policy}, `headline`, `detail`, `source`); prune items older than about four months unless they remain the current source of a headline figure; refresh `upcoming`; append a `changelog` entry listing what changed.
4. `data/meta.json`: set `edition`, `generatedAt` (today) and `nextScheduledRun` (the first of next month).

Style: plain, specific sentences; numbers with units and dates; no vendor marketing language; no adjectives the evidence does not support. Say "students" not "kids"; "Black, Hispanic/Latino, White, Asian" as the source uses them.

## 4. Validate

Run, and fix anything that fails:

```
node scripts/validate-data.mjs --links
node scripts/build-single.mjs
npx serve . -l 8080 &  # or any static server
node scripts/screenshot.mjs http://localhost:8080/ qa
```

Look at the screenshots in `qa/` for label collisions, overflow, empty cards or broken charts before opening the PR.

## 5. Accuracy self-review

Before committing, go through every changed number and confirm:

- it appears verbatim (or as an exact rounding) in the cited source;
- the population, year and unit in `label`, `unit` and `asOf` match the source;
- deltas point the right way and `sentiment` reflects whether the change is good, bad or neutral for students;
- chart `x` labels and series arrays are the same length and in chronological order;
- the briefing `summary` does not claim anything the items do not support.

Record this review as a table in the PR body (figure, source, verified yes/no).

## 6. Commit and open a pull request

- Commit message: `Research: <Month YYYY> edition` with a short body listing the headline changes.
- Push the branch and open a PR against the default branch titled `Monthly research: <Month YYYY>`; the body should contain the summary paragraph, the verification table from step 5, and any figures you deliberately left unchanged because no newer primary source exists.
- Do not merge. A person reviews and merges; the Pages deploy runs on merge.

## When the task is run by a Claude Code Routine

The routine uses the same protocol. Attach the repository (owner `ddchristopher`, repo `Edu-field-research`) with the session's repository tool, clone it, and proceed from step 0. If a PR for the current month already exists, update that branch instead of opening a second PR.
