# Sprint 2 - 22/09/2026 to 04/10/2026

## Sprint goal

The goal of Sprint 2 is to be able to log in/sign up via Google, add a product to the watchlist and view its details. 

## Committed

| Issue | Story | Points | Owner                        |
|:-----:|:-----:|:------:|:---------------------------- |
|  #80  |  US01 |    5   | @Dai-Nguyen1506              |
|  #74  |  US04 |    3   | @Dai-Nguyen1506              |
|  #73  |  US04 |    5   | @Dai-Nguyen1506              |
|  #85  |  US05 |    2   | @Dai-Nguyen1506              |
|  #42  |  US01 |    5   | N/A                          |
|  #84  |  US05 |    5   | @mfortunaa                   |
|  #72  |  US04 |    3   | @happyhusky3303              |
|  #86  |  US05 |    2   | @huydang2006                 |
|  #77  |  US01 |    3   | @CaMapCon26                  |
|  #78  |  US01 |    5   | @CaMapCon26                  |
| #100|  N/A  |    0   | @CaMapCon26                  |
|  #83  |  US05 |    2   | @huydang2006                 |
|  #82  |  US05 |    3   | @huydang2006                 |
|  #79  |  US01 |    3   | @mfortunaa                   |
|  #66  |  US05 |    1   | @Dai-Nguyen1506              |
|  #65  |  US05 |    1   | @Dai-Nguyen1506              |
|  #70  |  US04 |    5   | @happyhusky3303              |
|  #64  |  US05 |    5   | @Dai-Nguyen1506              |
|  #60  |  N/A  |    0   | @Dai-Nguyen1506              |
|  #58  |  N/A  |    0   | @Dai-Nguyen1506              |
|  #46  |  US05 |    5   | N/A                          |
|  #45  |  US04 |    8   | @CaMapCon26, @happyhusky3303 |
|  #62  |  US04 |    2   | @Dai-Nguyen1506              |
|  #69  |  US05 |    1   | @Dai-Nguyen1506              |
|  #76  |  US01 |    3   | @CaMapCon26                  |
|  #68  |  US05 |    3   | @Dai-Nguyen1506              |
|  #67  |  US05 |    2   | @Dai-Nguyen1506              |
|  #81  |  US01 |    3   | @CaMapCon26                  |
|  #75  |  US01 |    3   | @CaMapCon26                  |
|  #71  |  US04 |    3   | @happyhusky3303              |

**Total committed: 91 points**

## Result

| Issue | Points | Status              | If not done, why |
| ----- | ------ | ------------------- | ---------------- |
| #80   | 5      | Done                |                  |
| #74   | 3      | Done                |                  |
| #73   | 5      | Done                |                  |
| #85   | 2      | Done                |                  |
| #42   | 5      | Done                |                  |
| #84   | 5      | Done                |                  |
| #72   | 3      | Done                |                  |
| #86   | 2      | Done                |                  |
| #77   | 3      | Done                |                  |
| #78   | 5      | Done                |                  |
| #100| 0      | Done                |                  |
| #83   | 2      | Done                |                  |
| #82   | 3      | Done                |                  |
| #79   | 3      | Done                |                  |
| #66   | 1      | Done                |                  |
| #65   | 1      | Done                |                  |
| #70   | 5      | Done                |                  |
| #64   | 5      | Done                |                  |
| #60   | 0      | Done                |                  |
| #58   | 0      | Done                |                  |
| #46   | 5      | Done                |                  |
| #45   | 8      | Done                |                  |
| #62   | 2      | Done                |                  |
| #69   | 1      | Done                |                  |
| #76   | 3      | Done                |                  |
| #68   | 3      | Done                |                  |
| #67   | 2      | Done                |                  |
| #81   | 3      | Done                |                  |
| #75   | 3      | Done                |                  |
| #71   | 3      | Done                |                  |

**Completed: 91 points. Velocity this sprint: 91**

## Sprint Review

- What we demonstrated:
1. Authentication & User Management: User login/registration flow into the application.
2. Product Tracking: Pasting product links from Amazon to save them into the user's tracking list.
- Feedback received: The link pasting flow works, but it delays too long. A better UX would be to let the user paste the link and see a loading indicator while the system processes it. We should also add a way to view the details of the tracked product. Great feedback on achieving 100% completion rate for all 91 committed story points.
- Backlog changes as a result: 
1. Expanded User Authentication (US04): Upgraded from Google-only login to a full multi-provider system (Email + OTP verification + Google OAuth + Password Reset). Story points increased from 3 to 8.
2. User Profile & Nickname Support: Added nickname fields to registration, Google OAuth sync, and profile editing endpoints (/api/v1/user/me).
3. Strict 10-Product Tracking Limit (BR8, US05): Moved limit enforcement to the front end so users are blocked before opening the product creation modal.
4. Switched Primary Marketplace to Amazon (BR9): Replaced Shopee/TikTok Shop scraping with Amazon via RapidAPI to ensure stable REST API data for testing; Shopee/TikTok adapters are deferred to Sprint 3+.
5. Added OTP Security & Redis (BR13): Integrated Redis to manage 6-digit OTP codes (5-minute expiration, 5-attempt threshold) for email registration and password resets.
Replaced Mini-Charts with Price Metrics (US03, US05-07): Replaced 30-day mini-charts with explicit "Current", "Lowest", and "Highest" price metrics calculated over the product's full history.

7-Day Retention Grace Period (BR15): Added logic to mark untracked products (untracked_since) and retain them for 7 days before permanent deletion.

## Retrospective

| Keep doing | Stop doing | Start doing |
| ---------- | ---------- | ----------- |
| Finishing 100% of committed story points and delivering on sprint goals. | Leaving tasks until the last minute and rushing code implementations right before the deadline. | Writing and sharing detailed meeting minutes after every discussion to keep everyone aligned. |
| Maintaining strong team coordination and high quality across all tasks. | Arriving late for scheduled team meetings. | Setting up clear task ownership and early internal PR review deadlines. |

**One concrete action for next sprint (with an owner):**
* **Action:** Assign a designated note-taker at the start of each meeting to write and publish meeting minutes to the team channel within 2 hours after the call.
* **Owner:** @mfortunaa

## Attendance

| Member          | Planning | Review | Retro |
| --------------- | :------: | :----: | :---: |
| @Dai-Nguyen1506 |    x     |   x    |   x   |
| @happyhusky3303 |    x     |   x    |   x   |
| @mfortunaa      |    x     |   x    |   x   |
| @huydang2006    |    x     |   x    |   x   |
| @CaMapCon26     |    x     |   x    |   x   |
