# Sprint 5 - 02/11/2026 to 12/11/2026

## Sprint goal

Deploy the complete Trakora application to a public HTTPS URL gated by automated GitHub Actions CI checks, polish the UI based on Milestone 3 feedback, and document production operations, monitoring, and rollback procedures for the v1.0 release.

## Committed

| Issue | Story | Scope | Points | Owner (PR author) |
|:-----:|:-----:|:------|:------:|:------------------|
| #178 | US04 | Redesign the `/` landing page with comprehensive features and visual charts | 3 | @Dai-Nguyen1506 |
| #182 | US04 | Redesign the entire loading delay section across login, OTP, and page states | 3 | @happyhusky3303 |
| #184 | US05 | Format the watchlist to display clean product summaries and single price labels | 3 | @mfortunaa |
| #186 | US01 | Adjust and expand the detailed product information displayed on `/detail` | 2 | @happyhusky3303 |
| #187 | US03 | Redesign and improve price history chart readability and gap rendering | 3 | @mfortunaa |
| #188 | US09 | Improve customer product reviews display with pagination and star-rating filters | 3 | @happyhusky3303 |
| #189 | US05 | Redesign the navigation bar for long user nicknames and responsive layout | 2 | @happyhusky3303 |
| #190 | US04 | Add confirmation modals for critical user actions and complete account deletion | 3 | @huydang2006 |
| #212 | N/A | Prepare application deployment and configure `.github/workflows/ci.yml` | 2 | @CaMapCon26 |
| #223 | N/A | Configure Gmail SMTP (`SMTP_PASSWORD`) for production OTP emails | 3 | @CaMapCon26 |
| #224 | N/A | Configure production CORS origins (`CORS_ORIGINS`) for the API | 3 | @CaMapCon26 |
| #225 | N/A | Configure backend Docker container and `$PORT` binding for Render production | 3 | @CaMapCon26 |
| #226 | N/A | Support Supabase PostgreSQL Session Pooler connection configuration | 2 | @CaMapCon26 |
| #227 | N/A | Configure Render Key Value (Redis) connection and graceful 503 fallback | 2 | @CaMapCon26 |
| #228 | N/A | Gate Render production deployments on successful GitHub Actions checks | 2 | @CaMapCon26 |
| #230 | N/A | [Chore] Sprint 5 wrap-up and Milestone 5 operations documentation | 0 | @Dai-Nguyen1506 |

**Total committed: 39 points**

## Result

| Issue | Points | Status | If not done, why |
|:-----:|:------:|:-------|:-----------------|
| #178 | 3 | Done — merged in PR #215 | |
| #182 | 3 | Done — merged in PR #222 | |
| #184 | 3 | Done — merged in PR #229 | |
| #186 | 2 | Done — merged in PR #221 | |
| #187 | 3 | Done — merged in PR #216 | |
| #188 | 3 | Done — merged in PR #219 | |
| #189 | 2 | Done — merged in PR #217 | |
| #190 | 3 | Done — merged in PR #218 | |
| #212 | 2 | Done — merged in PR #214 | |
| #223 | 3 | Done — merged in PR #231 | |
| #224 | 3 | Done — merged in PR #232 | |
| #225 | 3 | Done — merged in PR #233 | |
| #226 | 2 | Done — merged in PR #234 | |
| #227 | 2 | Done — merged in PR #235 | |
| #228 | 2 | Done — merged in PR #236 | |
| #230 | 0 | Done — merged in PR #239 | |

**Completed: 39 points. Velocity this sprint: 39**

## Sprint Review

- **What we demonstrated:**
  - Live production deployment at `https://group2-ai66a-se-1.onrender.com` backed by Render Web Service, Supabase PostgreSQL Session Pooler, and Render Key Value (Redis 7).
  - CI-gated release pipeline (`.github/workflows/ci.yml` running Python pytest, Node build/Vitest, and secret scanning) with `main` branch protection and Render Auto-Deploy after green CI.
  - Public `/health` endpoint verifying live PostgreSQL (`SELECT 1`) and Redis (`PING`) connectivity (returning HTTP 200 when healthy and HTTP 503 when unavailable).
  - UI improvements addressing M3 feedback: redesigned landing page (`#178`), unified loading states (`#182`), formatted watchlist summaries (`#184`), clearer price-history chart nodes and gap highlighting (`#187`), star-filtered customer reviews (`#188`), responsive top navbar (`#189`), and confirmation modals for destructive actions (`#190`).
  - Complete Operations Manual (`docs/operations.md`) covering release, rollback, CI pipeline, monitoring, technical debt, maintenance plan, and lessons learned.
- **Feedback received:** Production environment variables (`DATABASE_URL`, `REDIS_URL`, `CORS_ORIGINS`, `SMTP_PASSWORD`) and URL-encoded database passwords in Alembic migrations were tested and hardened so container startups and health checks succeed reliably on Render.
- **Backlog changes as a result:** Tagged release `v1.0` on `main`. Remaining P2 stretch items (US11, US12) and minor post-release codebase cleanup (`#179`, `#238`) are documented for post-v1.0 maintenance.

## Retrospective

| Keep doing | Stop doing | Start doing |
| ---------- | ---------- | ----------- |
| Deploying early in the sprint and gating every production release on green GitHub Actions checks and peer PR reviews. | Waiting until production deployment to test URL-encoded database credentials and strict CORS origin headers. | Verifying `/health`, Render startup logs, and all P0 user journeys in a private browser window immediately after every production merge. |

**One concrete action for next sprint (with an owner):**

- **Action:** Monitor `https://group2-ai66a-se-1.onrender.com/health` and Render service logs daily until final grading is completed, rolling back immediately to tag `v1.0` if any regression occurs.
- **Owner:** @Dai-Nguyen1506 (Sprint 5 Scrum Master & Product Owner).

## Attendance

| Member | Planning | Review | Retro |
| ------ | :------: | :----: | :---: |
| @Dai-Nguyen1506 | Present | Present | Present |
| @huydang2006 | Present | Present | Present |
| @CaMapCon26 | Present | Present | Present |
| @maimanhbel (@mfortunaa) | Present | Present | Present |
| @happyhusky3303 | Present | Present | Present |
