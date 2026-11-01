# Sprint 4 - 23/10/2026 to 01/11/2026

## Sprint goal

Prove that every P0 story is checked by automated tests running in seconds without external dependencies, and deliver complete automated test coverage, robust OTP authentication, responsive detail UI, and accurate shop trust assessments.

## Committed

| Issue | Story | Scope | Points | Owner (PR author) |
|:-----:|:-----:|:-------|:------:|:-----------------|
| #205 | US04 | Add automated test coverage and boundary checks for US04 (OTP and Auth) | 3 | @CaMapCon26 |
| #204 | US01 | Add automated unit tests for watchlist creation, limits, and grace period | 3 | @CaMapCon26 |
| #195 | US02 | Add automated unit tests for target price validation and alert rules | 3 | @CaMapCon26 |
| #196 | US03 | Add automated tests for full price history and time-series gap detection | 3 | @happyhusky3303 |
| #185 | US10 | Build notification management page, server-side seen tracking, and regression suite | 5 | @maimanhbel |
| #177 | US01 | Integrate real-time VND currency exchange rate and database conversion | 3 | @Dai-Nguyen1506 |
| #181 | US03 | Fix mobile viewport layout and responsive price history chart on mobile devices | 3 | @Dai-Nguyen1506 |
| #180 | US02 | Redesign notification toasts and implement server-side mark-seen tracking | 3 | @huydang2006 |
| #138 | US09 | Display shop trust labels, review counts, and customer ratings | 3 | @happyhusky3303 |
| #183 | US04 | Fix OTP frontend form verification, resend cooldown, and spam prevention | 2 | @Dai-Nguyen1506 |
| #139 | US03 | Polish detail page layout and milestone reference lines | 2 | @happyhusky3303 |
| #211 | N/A | [Chore] Refine backlog for Sprint 4 | 0 | @Dai-Nguyen1506 |
| #212 | N/A | [Chore] Sprint 4 wrap-up | 0 | @huydang2006 |

**Total committed: 33**

## Result

| Issue | Points | Status | If not done, why |
|:-----:|:------:|:------|:-----------------|
| #205 | 3 | Done — merged in PR #209 | |
| #204 | 3 | Done — merged in PR #207 | |
| #195 | 3 | Done — merged in PR #203 | |
| #196 | 3 | Done — merged in PR #202 | |
| #185 | 5 | Done — merged in PR #208 | |
| #177 | 3 | Done — merged in PR #201 | |
| #181 | 3 | Done — merged in PR #197 | |
| #180 | 3 | Done — merged in PR #194 | |
| #138 | 3 | Done — merged in PR #193 | |
| #183 | 2 | Done — merged in PR #192 | |
| #139 | 2 | Done — merged in PR #173 | |
| #211 | 0 | Done — closed | |
| #212 | 0 | Done — closed | |

**Completed: 33. Velocity this sprint: 33.**

## Sprint Review

- **What we demonstrated:**
  - Full automated test suite for all P0 stories (US01 through US05) running in sub-seconds offline without server or real database.
  - Complete OTP verification, 5-minute expiry boundary, and 5-attempt limit protection against brute force.
  - Shop trust labels (Trusted, Needs caution, Risky) based on ratings and review counts.
  - Real-time exchange rate calculation and currency localization.
  - Responsive price history charts with gap detection and target price milestone reference lines.
- **Feedback received:** Automated tests run cleanly across all developer workstations and CI runners. Test failure in shop trust label validation was caught and guarded with dedicated unit tests.
- **Backlog changes as a result:** Transition focus to final Milestone 5 deployment, end-to-end performance testing, and production hardening.

## Retrospective

| Keep doing | Stop doing | Start doing |
| ---------- | ---------- | ----------- |
| Writing unit tests for business logic boundary conditions before merging features. | Leaving test assertions dependent on external tools like npm without fallback handling. | Running deliberate mutation tests to verify that automated tests fail when rules are broken. |

**One concrete action for next sprint (with an owner):**

- **Action:** Set up automated CI pipeline running `pytest` and frontend Vitest on every pull request to catch regressions before review.
- **Owner:** @Dai-Nguyen1506 (Product Owner).

## Attendance

| Member          | Planning | Review | Retro |
| --------------- | :------: | :----: | :---: |
| @Dai-Nguyen1506 | Present  | Present| Present |
| @huydang2006    | Present  | Present| Present |
| @CaMapCon26     | Present  | Present| Present |
| @maimanhbel     | Present  | Present| Present |
| @happyhusky3303 | Present  | Present| Present |

