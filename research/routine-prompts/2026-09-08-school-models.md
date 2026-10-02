# Monthly routine prompt: school-models audience

**In effect:** September 8, 2026 onward
**Audience:** a program director at an evidence-driven K-12 funder whose portfolio is scaling proven
school models and building evidence on new school designs, including schools built around AI.
**Trigger:** `trig_01MjVV8TVzTXLpfQKnQFAyoN`, cron `0 13 1 * *`

---

You are running the scheduled monthly research refresh for Chalkline, a U.S. K-12 education dashboard in the GitHub repository ddchristopher/Edu-field-research. Work autonomously; no human is watching this session.

Chalkline has one reader: a program director at an evidence-driven funder who invests in scaling proven school models and in building evidence on new school designs, including schools built around AI. Everything you add should help that reader decide what to fund, what to watch, and what to disbelieve. Landscape material earns its place only as context for those decisions.

1. The repository is attached to this routine as a source, so it should already be checked out. Confirm with `git remote -v` and `git status`. If it is missing, attach it with add_repo (owner "ddchristopher", repo "Edu-field-research", access "push") and clone it; if that fails, stop and report why. Then `git fetch origin`, find the default branch with `git remote show origin` (it may not be named main) and check it out.

2. Read research/MONTHLY_RESEARCH_TASK.md and research/SCHEMA.md and follow them exactly. The edition is the current calendar month.

3. Fetching. The sandbox egress proxy blocks plain WebFetch on most publisher domains this dashboard depends on, including rand.org, pewresearch.org, news.gallup.com, nagb.gov, nces.ed.gov, nwea.org, publiccharters.org, returntolearntracker.net, gse.harvard.edu and excelined.org. Check which Firecrawl tools this session actually has before planning.
   - If `mcp__Firecrawl__firecrawl_scrape` exists, use it as the primary fetcher (formats ["markdown"], onlyMainContent true; add parsers ["pdf"] with pdfOptions {maxPages: 20} for PDFs).
   - If only `mcp__Firecrawl__firecrawl_search` exists, which happens when the connector is the search-only endpoint, use it with `includeDomains` set to the publisher's own domain so the snippet you quote comes from the primary source. A figure stated verbatim in a snippet from the publisher's own domain is acceptable; a figure from a third-party summary is not.
   - If neither exists, say so at the top of your report, verify what you can with WebSearch and WebFetch, and leave every unconfirmable figure exactly as it is with its existing asOf date.
   - NAEP national trends come from a JSON service that is cheap and not blocked: nationsreportcard.gov/DataService/GetAdhocData.aspx with type=data, subject, grade, subscale, variable=TOTAL, jurisdiction=NT, stattype=MN:MN and a Year list.
   - Credits are metered. Roughly 100 to 200 should cover a refresh; one page often verifies several figures.

4. Priorities for this edition, in order:
   - **School models.** New lottery or matched-comparison evidence on networks and district models; CREDO and its critics; network expansion, closures and conversions; charter enrollment and share (NAPCS publishes in the autumn); authorizer and cap policy; facilities capital. For new designs, track AI-first networks (Alpha School and 2 Hour Learning, Unbound Academy), microschools, competency-based and portrait-of-a-graduate models. Move a row from the new-designs lane into the proven lane only when an independent evaluation publishes. Report null findings as readily as positive ones. Always attribute an operator's own results to the operator in the row text.
   - **Conditions for scale.** State accountability and assessment policy, ESEA waivers, n-size and reporting rules, the state of IES, NCES, NAEP and the What Works Clearinghouse, SEDA and other cross-state data, and capital flows from Walton, City Fund, Bloomberg, Charter School Growth Fund, NewSchools and XQ. Keep the "where the field disagrees" block populated and honest.
   - **AI and learning.** Keep the two bets separate: AI as a tool inside conventional schools, which has evidence, and AI as the core of a school design, which does not.
   - **Academic foundations and the landscape.** Update as context, not as the headline.

5. Verify every new figure on the publisher's own page or a publisher-domain snippet before using it. Prefer primary sources. Never invent or estimate. If no newer primary source exists, keep the existing value and its asOf date.

6. Update only the JSON files in data/: sources.json, overview.json, models.json, ai.json, math.json, conditions.json and briefing.json, plus meta.json for the edition dates. Do not change page code unless the protocol requires a schema-compatible fix. Give every briefing item an `implication`: one sentence on what it means for a school-model portfolio, written separately from the quoted figures. models.json ranks nothing; quote each effect with the study that produced it.

7. Run `node scripts/validate-data.mjs --links` and fix every failure. If Playwright is available, serve the folder and run `node scripts/screenshot.mjs`, then check the screenshots for broken charts or overflow.

8. Branch and push carefully. This session may open on an auto-created branch such as claude/confident-maxwell. Do not leave the edition's work there. Create the edition branch from the default branch with `git checkout -b research/YYYY-MM`, commit with the message "Research: <Month YYYY> edition", and push with `git push -u origin research/YYYY-MM`. Before finishing, run `git status` and `git log --oneline -3` to confirm your commits are on that branch and pushed. If the push is rejected, report the exact error rather than pushing somewhere else.

9. Open a pull request against the default branch titled "Monthly research: <Month YYYY>" using the GitHub MCP tools if available. If they are not, report the branch name and the compare URL (https://github.com/ddchristopher/Edu-field-research/compare/<default-branch>...research/YYYY-MM). The PR body, or your report, must contain the edition summary, the verification table (figure, source, verified) the protocol requires, and a list of figures deliberately left unchanged. If a PR for this month already exists, push to its branch. Do not merge.

10. Finish with a short report: which Firecrawl tools were available, what changed in each section, what could not be verified and why, roughly how many credits the run used, which branch you pushed, and the PR or compare link.
