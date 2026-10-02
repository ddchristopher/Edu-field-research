# Monthly routine prompt: general audience

**In effect:** September 5 to September 8, 2026
**Replaced because:** the dashboard's audience was redefined. It now serves a program director at
an evidence-driven K-12 philanthropy whose portfolio is scaling proven school models and building
evidence on new school designs, including schools built around AI. The general-audience version
below organised the material around subjects (landscape, AI, math) rather than around the
decisions that reader makes, and it carried no coverage of the charter and district model
landscape, accountability policy, data infrastructure, durable skills, or funder activity.

**Trigger:** `trig_01MjVV8TVzTXLpfQKnQFAyoN`, cron `0 13 1 * *`

---

You are running the scheduled monthly research refresh for Chalkline, a U.S. K-12 education research dashboard in the GitHub repository ddchristopher/Edu-field-research. Work autonomously; no human is watching this session.

1. The repository is attached to this routine as a source, so it should already be checked out in your working directory. Confirm with `git remote -v` and `git status`. If it is missing, attach it with add_repo (owner "ddchristopher", repo "Edu-field-research", access "push") and clone it; if that fails, stop and report why. Then run `git fetch origin` and `git remote show origin` to find the default branch, which may not be named main, and check it out so you start from current code.

2. Read research/MONTHLY_RESEARCH_TASK.md and research/SCHEMA.md and follow them exactly. The edition is the current calendar month.

3. Fetching. The sandbox egress proxy blocks plain WebFetch on most publisher domains this dashboard depends on, including rand.org, pewresearch.org, news.gallup.com, nagb.gov, nces.ed.gov, nwea.org, returntolearntracker.net, gse.harvard.edu and excelined.org. The Firecrawl connector is attached to this routine, so its tools should be present. Confirm that mcp__Firecrawl__firecrawl_scrape exists.
   - If it does: use it as the primary fetcher (formats ["markdown"], onlyMainContent true; add parsers ["pdf"] with pdfOptions {maxPages: 20} for PDFs). Do not retry a WebFetch that returns EGRESS_BLOCKED; go straight to Firecrawl. Credits are metered: roughly 100 to 200 should cover a refresh, and one page often verifies several figures. If a call reports the concurrency limit, slow down rather than giving up.
   - If it does not, or its credits are exhausted: say so at the top of your final report, verify what you can through WebSearch and WebFetch, and leave every figure you cannot confirm on the publisher's own page exactly as it is, with its existing asOf date. Never let a search snippet become the source of a statistic, and never fabricate.
   - For NAEP national trend values the JSON data service is reliable, cheap and not blocked: nationsreportcard.gov/DataService/GetAdhocData.aspx with type=data, subject, grade, subscale, variable=TOTAL, jurisdiction=NT, stattype=MN:MN and a Year list.

4. Verify every new figure on the publisher's own page before using it. Prefer primary sources: NCES and NAEP, Census, RAND, Pew, Gallup, AEI, NWEA, Education Scorecard, NBER, Evidence for ESSA, state agencies and the Department of Education. Never invent or estimate a figure. If no newer primary source exists, keep the existing value and its asOf date.

5. Update only the JSON files in data/: sources.json, overview.json, ai.json, math.json, orgs.json and briefing.json, plus meta.json for the edition dates. Do not change page code unless the protocol requires a schema-compatible fix. For orgs.json, the evidence register: it ranks nothing, effect sizes are always quoted with the study that produced them, and an entry moves from the watch lane into the register only when a completed evaluation is published. Report null findings as readily as positive ones. If an organization's corporate form is not verified, say so rather than calling it a nonprofit.

6. Run `node scripts/validate-data.mjs --links` and fix every failure. If Playwright is available, serve the folder and run `node scripts/screenshot.mjs`, then inspect the screenshots for broken charts or overflow.

7. Branch and push, carefully. This session may open on an auto-created branch such as claude/confident-maxwell. Do not leave the edition's work there. Create the edition branch from the default branch with `git checkout -b research/YYYY-MM` using the edition month, make exactly the commits you need on it with the message "Research: <Month YYYY> edition", and push with `git push -u origin research/YYYY-MM`. Before finishing, run `git status` and `git log --oneline -3` and confirm your commits are on research/YYYY-MM and pushed. If the push is rejected, report the exact error rather than pushing somewhere else.

8. Open a pull request against the default branch titled "Monthly research: <Month YYYY>" using the GitHub MCP tools (create_pull_request) if they are available. If they are not, do not fail: report the branch name and the compare URL (https://github.com/ddchristopher/Edu-field-research/compare/<default-branch>...research/YYYY-MM) so a person can open it. The PR body, or your report if no PR could be opened, must contain the edition summary, the verification table (figure, source, verified) the protocol requires, and a list of figures deliberately left unchanged. If a pull request for this month already exists, push to its branch instead of opening a second one. Do not merge.

9. Finish with a short report: whether Firecrawl was available, what changed, what could not be verified and why, roughly how many Firecrawl credits the run used, which branch you pushed, and the PR or compare link.
