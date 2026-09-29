# Backwards–Forwards research: trading-bot discovery versus approval — 2026-09-29

Status: narrow RESEARCHED; unsafe approval semantics identified; no code change or market/provider run. Base TIME master @ 683dd40ff6ddc7aed43c35e1f41c5a6fb775085e. Scope read fully: `src/backend/research/bot_research_pipeline.ts`, `BEAST-JEV-READ-FIRST.md`; historical `TIME_MASTER_AUDIT.md` and `TIME_BUILD_TRACKER.md` read for conflicting assertions. Other trading/execution systems not audited in this slice.

## Backwards: old versus current
The December 2025 audit called many front-end journeys simulated and flagged mock research ingestion. A later December tracker calls 34/34 pages connected to real APIs, while explicitly describing demo fallbacks. These dated assertions are not proof of live broker orders, research or risk controls in September 2026.

Current BotResearchPipeline has **one real metadata discovery path**: GitHub repository search via HTTP with optional token. The MQL5, cTrader, TradingView and forum methods now truthfully return no candidates and log that source ingestion is unimplemented. This is a genuine improvement over fake candidates. It does **not** turn GitHub search into bot due diligence.

The approval path remains a problem: GitHub stars are mapped to `downloads`, forks to `reviews`; license uses the top-level API field. `evaluateCodeQuality` gives 70 points without fetching or reading code, and `performSafetyCheck` gives 80+ based on source and declared code availability without scanning. `evaluatePerformanceClaims` scores description keywords without performance records. The weighted score can set `status: 'approved'` at >=65 and safety >=60. That is **metadata approval**, not code quality, safety or trading fitness. `markAsIngested` changes a Map status; it does not prove an isolated import, persistent evidence or strategy validation.

## Primary research
- GitHub REST repository search and licensing docs, https://docs.github.com/en/rest/search/search#search-repositories and https://docs.github.com/en/rest/licenses/licenses : use metadata to **discover** candidates. The API description/stars/forks/license hint cannot prove behavior or reuse rights. Disposition **ADAPT** discovery only; inspect exact commit, license/dependencies and complete source before reuse.
- FINRA Regulatory Notice 15-09, https://www.finra.org/rules-guidance/notices/15-09 : discusses supervision, development/testing, controls and monitoring of algorithmic strategies for member firms. Disposition **STUDY** control design; applicability to MGR is not determined by this dossier and it is not a compliance certification.
- SEC Investor Bulletin on performance claims, https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-47 : backtested results are hypothetical and distinct from actual results. Disposition **ADOPT** evidence labeling and refusal of implied performance proof from a description.
No candidate repo, model, broker or proprietary market feed was selected/installed, and no subscription cost established.

## Research-to-spec gates before changing product behavior
1. Discovery record: exact URL and immutable commit, retrieval time, source terms/rate limits, maintainers, license text/dependency/asset rights, authorship and the full input metadata. Stars/forks stay popularity hints, never downloads/reviews or safety.
2. Source review: fetch exact source/dependencies and inspect execution surface, credentials/network calls, order submission, data lookahead, external downloads, hard-coded risk and tests. Sandbox any untrusted code; reading metadata cannot skip this gate.
3. Claim evaluation: separate author-stated/backtest/paper/live independent records, dataset/time range, leakage/survivorship, fees/slippage, drawdown, capital assumptions and reproducibility. Unknown or unverifiable fields remain UNKNOWN, not base-score 70/80.
4. Trading authority: `discovered -> source_reviewed -> licensed -> sandbox_evaluated -> candidate_for_owner_review`; no automatic `approved` based on a blended score. Live execution remains a separate actor/permission/risk gate with explicit owner controls, durable order receipts, reconciliation and kill switch.
5. Negative cases: repo with many stars but malicious code, SPDX label mismatching LICENSE, no source, stale commit, cherry-picked backtest, hidden fee/slippage, duplicate candidate, source API outage/rate limit and unimplemented marketplace. Record concrete refusal or unknown state.

## Next proof
Create a frozen fixture set of benign/malicious/unknown repositories (without executing their code) and validate discovery fields; then inspect one licensed candidate end to end, including its dependency rights and testability. Only after research should the scoring/state implementation be changed and tested. This dossier does not authorize trading or determine MGR regulatory status.
