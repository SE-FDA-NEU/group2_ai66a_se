# Software Development Process: Price Tracking & Comparison Platform

## Part 1 — Selected Process and Position on the Process Spectrum

**(a) Model.** The team has selected an **Incremental** model in a lightweight Scrum style, with 2-week cycles. A typical cycle: at the start of the week, a short planning meeting is held to select items from `docs/backlog.md` (e.g., adding an adapter for an e-commerce platform, refining the alert engine); during the week, each member codes on their own branch and posts daily progress updates in chat; at the end of the cycle, the new build is demoed on staging, feedback is recorded, and a short retrospective is held to adjust the backlog. Output: a working build plus an updated backlog for the next cycle.

**(b) Position.** The process leans roughly **70% agile — 30% plan-driven**. Fixed for the entire semester: four milestones and demo dates set by the course, the overall architecture (scraper → validator → time-series DB → dashboard), and the core tech stack. Left open each cycle: feature priorities, which e-commerce platform to tackle next, UI details, and how scraping errors are handled.

## Part 2 — Five Diagnostic Questions

1. **Stable or volatile?** The overall concept is stable, but the technical layer is **highly volatile**: the HTML/API structure of e-commerce sites can change at any time, and anti-bot mechanisms may force mid-stream changes to data-collection methods. Evidence: preliminary research already found some platforms requiring JS rendering or enforcing undocumented rate limits.
  
2. **Safety/legal impact?** There is no life-safety risk, only mild legal risk: scraping may violate some platforms' Terms of Service, and the system stores user emails, requiring basic data-security compliance. The team documents which platforms are permitted to scrape in `docs/legal-notes.md`, without needing the formal change-control process typical of healthcare or finance projects.
  
3. **Team size and location?** A small team (4–5 people), co-located during class hours, with additional communication via Discord outside class. Low communication overhead means no heavyweight coordination process is needed — just brief meetings and asynchronous updates.
  
4. **Continuous or milestone-based customer involvement?** The primary customer is the instructor, involved only at **4 fixed milestones**. The team compensates through self-dogfooding each cycle to catch issues early rather than waiting for milestones.
  
5. **Organizational culture/contractual constraints?** The course imposes four milestones and one final demo session with fixed dates and times — the sole non-negotiable constraint, which forces the team to have plan-driven checkpoints interspersed between agile cycles.
  

## Part 3 — Risks of the Opposite Choice (Pure Waterfall)

If the team switched entirely to **Waterfall**, the biggest risk would be: **the design being locked in based on incorrect assumptions about e-commerce sites' web structure made during the initial survey phase**. Mechanism of harm: the detailed design phase would fix the parser and schema for every platform upfront; when a platform changes its HTML or adds a CAPTCHA mid-project, there is no iteration point for early adjustment — the team would only discover the problem during full system integration near the end, forcing rushed fixes close to the deadline. First symptom: at the integration/testing stage (typically milestone 3), one or more platforms' scrapers return empty data or fail en masse, even though the paper design had already been approved — revealing that the gap between documentation and reality had existed for a long time, undetected due to the lack of early testing cycles.

## Part 4 — Committed Process Rules

- Cycles last 2 weeks; the backlog in `docs/backlog.md` is re-prioritized at the start of each cycle.
- Every change merged into `main` must go through a Pull Request and receive substantive review comments from at least one other team member before approval.
- Every new scraper adapter must follow the common interface `scrape(url) -> {name, price, in_stock}` and be documented in `docs/adapters.md` before merging.
- Requirement changes arising after a milestone has been approved must be recorded in `docs/changelog.md`, along with the date and reason.
- Each team member posts a brief progress update in the team chat channel before 10 PM on working days during the cycle.
