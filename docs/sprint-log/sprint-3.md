# Sprint 3 - weeks 9–10

## Sprint goal

Prove that users can complete the core product-owner stories through the UI with real database data. Deliver price history and target-price notification flows, improve the watchlist and detail screens, and ensure that the app responds clearly to loading, missing-data, and error states.

## Committed

| Issue | Story | Scope | Points | Owner (PR author) |
|:-----:|:-----:|:-------|:------:|:-----------------|
| #126 | N/A | Fix frontend route guard so protected pages redirect unauthenticated users to login | 0 | @Dai-Nguyen1506 |
| #127 | US05 | Restyle login, register, and watchlist pages consistently | 3 | @mfortunaa |
| #48 | US07 | Show price labels and notify users when a product reaches a good price | 5 | @CaMapCon26 |
| #49 | US08 | Sort tracked products by current price in ascending or descending order | 3 | @mfortunaa |
| #130 | US02 | Design notification templates and sending function | 2 | @huydang2006 |
| #131 | US02 | Automatically check product prices and trigger notifications | 3 | @huydang2006 |
| #132 | US01 | Untrack products while retaining product and price history for 7 days | 3 | @Dai-Nguyen1506 |
| #133 | US02 | Send target prices to the backend and add the product unfollow action | 3 | @CaMapCon26 |
| #135 | US10 | Add notification setup API and respect each user's notification time window | 4 | @CaMapCon26 |
| #144 | N/A | Refine the backlog for Sprint 3 | 0 | @Dai-Nguyen1506 |
| #149 | US03 | Store product price history and index it for time-series queries | 2 | @Dai-Nguyen1506 |
| #150 | US03 | Add price-history API, calculate min/max and tracked days, and detect gaps | 2 | @Dai-Nguyen1506 |
| #151 | US03 | Build a mobile-responsive price-history chart | 2 | @Dai-Nguyen1506 |
| #152 | US03 | Show missing-data gaps and custom chart tooltips | 2 | @Dai-Nguyen1506 |
| #155 | US02 | Add target-price update API and enforce BR1 validation | 3 | @Dai-Nguyen1506 |
| #156 | US02 | Implement target-price notification state transitions under BR2 and BR4 | 3 | @Dai-Nguyen1506 |
| #157 | US02 | Add target-price form, BR1 validation, and alert badge on `/detail` | 3 | @Dai-Nguyen1506 |
| #158 | US02 | Display target-price notifications and navigate to marketplace product links | 3 | @mfortunaa |
| #164 | N/A | Fix product table column alignment with row values | 0 | @mfortunaa |

**Total committed: 46**

## Result

| Issue | Points | Status | If not done, why |
|:-----:|:------:|:------|:-----------------|
| #126 | 0 | Done — merged in PR #142 | |
| #127 | 3 | Done — merged in PR #160 | |
| #48 | 5 | Done — merged in PR #129; two acceptance criteria remain unchecked in the issue | Confirm acceptance criteria with the team |
| #49 | 3 | Done — merged in PR #128; acceptance criteria remain unchecked in the issue | Confirm acceptance criteria with the team |
| #130 | 2 | Done — merged in PR #141 | |
| #131 | 3 | Done — merged in PR #143 | |
| #132 | 3 | Done — merged in PR #148 | |
| #133 | 3 | Done — merged in PR #153 | |
| #135 | 4 | Done — merged in PR #146 | |
| #144 | 0 | Done — merged in PR #145 | |
| #149 | 2 | Done — issue closed | |
| #150 | 2 | Done — merged in PR #154 | |
| #151 | 2 | Done — merged in PR #162 | |
| #152 | 2 | Done — merged in PR #163 | |
| #155 | 3 | Done — merged in PR #159 | |
| #156 | 3 | Done — merged in PR #161 | |
| #157 | 3 | Done — merged in PR #165 | |
| #158 | 3 | Done — merged in PR #166 | |
| #164 | 0 | Done — merged in PR #167 | |

**Completed: 46. Velocity this sprint: 46.**

## Sprint Review

- **What we demonstrated:** Protected routes now require authentication; users can track and untrack products, sort the watchlist, view price labels, configure target prices, receive price-change notifications, and open marketplace listings. The detail page includes responsive price history with minimum/maximum values and clear visual treatment for data gaps. The frontend was restyled, with watchlist columns aligned to their values and detail-page metadata labels separated from their content.
- **Feedback received:** Integration surfaced a watchlist table alignment issue (#164) and product-detail metadata that ran together. The table now uses a shared responsive grid, and the detail metadata has spacing and responsive layout rules.
- **Backlog changes as a result:** Sprint 3 backlog refinement was completed in #144. Follow-up backlog changes after the sprint review were not available in the issue records checked.

## Retrospective

| Keep doing | Stop doing | Start doing |
| ---------- | ---------- | ----------- |
| Review integrated screens with real product data and verify the responsive layout. | Calling a UI task complete before checking the rendered page and its edge states. | Add visual alignment, metadata readability, and loading/error-state checks to frontend acceptance criteria and PR reviews. |

**One concrete action for next sprint (with an owner):**

- **Action:** Add a UI verification checklist to frontend PRs, covering desktop/tablet/mobile layouts, loading and empty states, and readable labels and values.
- **Owner:** @maimanhbel (Sprint 3 Scrum Master; confirm this action with the team at the retrospective).

## Attendance

| Member          | Planning | Review | Retro |
| --------------- | :------: | :----: | :---: |
| @Dai-Nguyen1506 | TBD | TBD | TBD |
| @happyhusky3303 | TBD | TBD | TBD |
| @mfortunaa      | TBD | TBD | TBD |
| @huydang2006    | TBD | TBD | TBD |
| @CaMapCon26     | TBD | TBD | TBD |
