# UI Improvement Report

## Summary

- **Navigation redesign (Phase 2):** Replaced the fixed sidebar with a sticky top bar, a config-driven primary navigation, a notification dropdown backed by the existing history/unseen APIs, and an account menu with profile and confirmed logout actions.
- **Responsive behavior:** Added a focus-managed hamburger drawer below 768px. The watchlist already uses product cards on small screens; that behavior was retained.
- **User identity and logout:** The account menu displays the full name and email, a deterministic initial avatar, and logout confirmation. The duplicate logout action was removed from the Profile page.
- **Cleanup and tests:** Removed the obsolete sidebar and its layout offsets/styles. Added navbar tests for active-route state, unread badge values, menus, keyboard behavior, and marking notifications read.
- **Out of scope:** Phase 1 watchlist/contrast work and Phase 3 logo options were not implemented because this change was scoped to the navbar.

## Decisions

- The top bar uses the existing dark navy as its active-state accent and a restrained navy tint for the active tab.
- Primary navigation items are defined in one array so later tabs can be added centrally.
- The mobile pattern is a hamburger drawer, while notification and account controls remain in the top bar.
- The notification menu shows the latest ten history entries and derives the unread badge from the existing unseen endpoint. Counts above nine display as `9+`; users can mark unseen notifications read or open the full history.
- The current app has no authenticated Overview page: `/` is the public landing page and authenticated visitors are redirected to `/watchlist`. The “Tổng quan” tab points to `/` to preserve the existing route; it therefore currently resolves to the watchlist for signed-in users. A separate destination needs a product decision.
- `/settings` is only a compatibility redirect to `/profile`; no Settings page or placeholder was added.
- The guide's four-width screenshots were not captured: no browser automation client or installed browser executable was available in this environment. No screenshot files were created.

## Open questions for the team

- The current product row maps **Khoảng giá** to `price_low`–`price_high`, **Đánh giá** to `product_rating`, and **Nhãn giá** to `price_label` (the last column also displays shop-trust badges). Should the visible labels be changed, and should shop trust be separated from price labels?
- Should an authenticated Overview page be created, or should the “Tổng quan” item be removed/merged with the watchlist?
- Is a dedicated Settings page planned, or should `/settings` continue redirecting to Profile?
- The backend currently supports in-app notifications and an `email_enabled` preference. Are other channels, such as push or SMS, planned?

## Deferred or skipped

- Phase 1 watchlist empty/loading/search states, column alignment, contrast measurements, and axe/Lighthouse checks were not changed.
- Phase 3 logo options, preview page, and accent-color proposal were not created.
- Before/after screenshots at 390px, 768px, 1024px, and 1440px were not produced because browser capture tooling was unavailable.

## Other problems noticed

- The Overview route is not distinct from the existing authenticated watchlist redirect, as described above.
- The existing production build reports a large JavaScript chunk (>500 kB); this was not changed because it is unrelated to navigation.

## How to verify

- From the repository root, run `Push-Location frontend; npm test; Pop-Location` and `Push-Location frontend; npm run build; Pop-Location`.
- Sign in and open `/watchlist`, `/notifications`, and `/profile` to exercise the primary tabs, notification history, and account menu. `/` currently redirects signed-in users to `/watchlist`.
- Expected screenshot location if browser capture is run later: `docs/images/navbar/` (390px, 768px, 1024px, and 1440px). No screenshots currently exist there.
