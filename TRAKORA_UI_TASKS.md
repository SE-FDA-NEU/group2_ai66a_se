# Trakora UI Improvement: Agent Task Guide (Phases 1-3)

You are an AI coding agent working on **Trakora**, a price-tracking web app (Vietnamese UI). Your job is to fix navigation and watchlist UI problems, redesign the navigation, and produce logo options. Work through the phases in order. Phase 3 (logo) can run in parallel with Phase 2.

Phase 4 (new features such as alert rules, price history, extensions) is **out of scope**. Do not build it.

---

## 0. Ground rules

1. **Explore before editing.** Identify the framework, styling approach (Tailwind, CSS modules, etc.), component library, router, and i18n setup. Match existing conventions. Do not add dependencies unless necessary; if you must, state why.
2. **Do not assume Tailwind.** Snippets in this file use Tailwind class names as examples. Translate them to whatever the project actually uses.
3. **Keep UI text in Vietnamese** and go through the existing i18n mechanism if one exists. Do not hardcode new strings if the project has translation files.
4. **Small, reviewable commits.** One commit per numbered task, with a clear message (e.g. `fix(sidebar): truncate long user name and email`).
5. **Do not guess product meaning.** The meanings of the table columns "Khoảng giá", "Đánh giá", "Nhãn giá" are unknown. Look at the data model and API for hints. If still unclear, list your question in the final report and use a clearly marked placeholder rather than inventing a meaning.
6. **No scope creep.** Do not refactor unrelated code. Note any other problems you find in the final report instead of fixing them.
7. **Accessibility is a requirement**, not a bonus: keyboard navigable, visible focus states, labels on icon-only buttons, WCAG AA contrast (4.5:1 for normal text, 3:1 for large text and UI components).

### Current UI reference

- Left sidebar with logo "Trakora" (a white "T" in a dark square) and four items: **Tổng quan** (Overview), **Danh sách theo dõi** (Watchlist, active, peach background), **Hồ sơ cá nhân** (Profile), **Thông báo** (Notifications).
- Bottom-left user block: grey circle avatar, display name `an`, email truncated as `giaan.nec@gmail....`, red logout icon.
- Watchlist page: title, subtitle, dark primary button "+ Thêm sản phẩm" at top right; toolbar with "Làm mới" (refresh), sort dropdown "Sắp xếp: Mặc định", search box; table with columns SẢN PHẨM, GIÁ HIỆN TẠI, KHOẢNG GIÁ, ĐÁNH GIÁ, NHÃN GIÁ, THAO TÁC; empty state text: "Bạn chưa có sản phẩm nào trong danh sách theo dõi."

---

## Phase 1: Quick fixes

**Goal:** fix the visible defects without changing the overall layout.

### 1.1 Fix truncated name and email in the user block

Problem: the email shows a trailing ellipsis because the container is too narrow, partly because the logout icon takes space.

Do:
- Make the text container shrinkable (`min-width: 0`, `flex: 1`) and apply single-line ellipsis only as a last resort.
- Add a `title` attribute (or accessible tooltip) showing the full name and full email.
- Restructure the footer so the logout control does not squeeze the text: for example, move logout into a menu (see Phase 2) or give the user block more width/padding.
- Test with: a very long email (50+ chars), a very long name, a short name, and non-ASCII names (Vietnamese diacritics).

Acceptance criteria:
- [ ] Full value is available on hover/focus and to screen readers.
- [ ] No overflow or layout shift with any of the test strings above.

### 1.2 Avatar fallback and name formatting

- If the user has no avatar image, render a circle with the **initial** of the display name (uppercase), with a background color derived deterministically from the user id or name.
- Display the name with proper capitalization (e.g. `an` becomes `An`) for display only. Do not modify stored data.
- If no display name exists, fall back to the part of the email before `@`.

Acceptance criteria:
- [ ] No blank grey circle remains.
- [ ] Initial handles empty strings, emoji, and diacritics (e.g. `Ân` shows `Â`).

### 1.3 Logout control

- Add `aria-label="Đăng xuất"` and a tooltip.
- Use a neutral color by default (red only on hover/focus, or not at all).
- Add a confirmation step (small dialog or popover) before logging out.
- If Phase 2 moves logout into a user menu, implement the confirmation there and skip duplicate work here; note this in the commit.

### 1.4 Watchlist empty state

- When the list has zero items **and** no search/filter is active: hide the toolbar (refresh, sort, search) and the table header, and show only the empty state.
- Add a primary button **inside** the empty state: "Thêm sản phẩm", wired to the same action as the header button. Optionally add a simple illustration or icon.
- Update the hint text so it no longer says "phía trên" (above), since the button is now right there.
- Keep the toolbar visible when a search returns no results, and use a different message for that case (e.g. "Không tìm thấy sản phẩm phù hợp", with a "Xóa tìm kiếm" action).

Acceptance criteria:
- [ ] Three distinct states exist: loading, empty list, empty search result.
- [ ] The empty-state button opens the same add-product flow as the header button.

### 1.5 Table column labels

- Find what "Khoảng giá", "Đánh giá", and "Nhãn giá" actually represent in the code/API.
- Propose clearer labels (e.g. "Khoảng giá" could become "Giá thấp nhất - cao nhất" if that is what it shows) and apply them **only if the meaning is verified**. Otherwise leave labels unchanged and list the question in the report.
- Review column widths and alignment: numeric columns right-aligned, consistent spacing, sensible min widths.

### 1.6 Accessibility and contrast pass

- Measure contrast for: inactive nav items, page subtitle, search placeholder, table header labels, empty-state secondary text. Darken any that fail AA.
- Add `aria-current="page"` to the active nav item.
- Ensure all interactive elements have a visible `:focus-visible` style.
- Ensure the search input has an accessible label (not placeholder-only).
- Run an automated check (axe, Lighthouse, or the project's existing tool) before and after; record the results.

### Phase 1 definition of done
- [ ] All six tasks complete, or explicitly deferred with a reason.
- [ ] Existing tests pass; add tests for the avatar fallback, name formatting, and empty-state logic.
- [ ] Before/after screenshots at 1440px and 390px widths.

---

## Phase 2: Navigation redesign

**Goal:** replace the left sidebar with a **top navigation bar**, reclassify items, and make the layout responsive.

### 2.1 Information architecture

| Item | New location |
|---|---|
| Tổng quan (Overview) | Primary nav tab |
| Danh sách theo dõi (Watchlist) | Primary nav tab |
| Thông báo (Notifications) | Bell icon with dropdown, right side. Keep the full page reachable from the dropdown ("Xem tất cả"). |
| Hồ sơ cá nhân (Profile) | Inside the user avatar menu |
| Đăng xuất (Logout) | Inside the user avatar menu, with confirmation |

Design the primary nav so adding new tabs later (e.g. Compare, Settings) is a one-line config change. Drive the nav from a single array of route definitions instead of hardcoding each link.

### 2.2 Top bar layout (desktop)

```
[Logo + wordmark]  [Tổng quan] [Danh sách theo dõi]  ........  [+ Thêm sản phẩm?] [Bell(badge)] [Avatar v]
```

- Sticky at the top, height about 56-64px, subtle bottom border.
- Active tab: clear indicator (underline or filled pill). Use the project's accent color, not an arbitrary peach. If no accent exists, propose one in Phase 3 and use a temporary token until then.
- Right cluster: notification bell with an **unread count badge** (hide at 0, show `9+` above 9), then the avatar button opening a menu.
- The avatar menu shows the full name and email at the top (wrapping or tooltip, never clipped without a tooltip), then Profile, (Settings placeholder only if the route exists), Logout.
- Optional: move the "+ Thêm sản phẩm" primary action into the bar only if it does not crowd it. Otherwise keep it on the watchlist page header.

### 2.3 Notification bell

- Dropdown lists the latest 5-10 notifications with timestamp and read/unread state, plus "Đánh dấu đã đọc" and "Xem tất cả".
- Use the existing notifications data source. If the API has no unread count, add the smallest backend or mock change required and document it. If the backend is out of reach, build the UI against a typed interface with a clearly labeled mock and flag it.
- Close on Escape and outside click; trap focus appropriately; support arrow-key navigation.

### 2.4 Responsive behavior

- Below the tablet breakpoint (about 768px): collapse primary tabs into a hamburger-triggered drawer **or** a bottom tab bar. Pick one and justify it in the PR description. Bell and avatar stay visible in the top bar.
- Watchlist table on small screens: switch to a card/list layout per product, or allow horizontal scroll with a sticky first column. Choose the simpler option that stays usable.
- Verify at 390px, 768px, 1024px, 1440px.

### 2.5 Content width

- Remove the large unused left gap. Use a container with a sensible max width (about 1280px) and consistent horizontal padding, so the six table columns have room.

### 2.6 Cleanup

- Remove the old sidebar component and its styles once nothing references it. Search for leftover imports, route wrappers, and layout offsets (e.g. left margins that compensated for the sidebar).

### Phase 2 acceptance criteria
- [ ] Top bar works with keyboard only (Tab, Enter, Escape, arrow keys in menus).
- [ ] Active route is highlighted and has `aria-current="page"`.
- [ ] Menus have correct roles (`menu`, `menuitem`) or use the project's accessible component library.
- [ ] No horizontal page scroll at 390px.
- [ ] Logout confirmation works and is not duplicated.
- [ ] Nav items come from one config array.
- [ ] Tests cover: route highlighting, unread badge visibility (0, 1, 9, 10+), menu open/close.
- [ ] Before/after screenshots at all four widths.

---

## Phase 3: Logo and brand options

**Goal:** deliver three logo directions as SVG, ready for the team to pick one. Do **not** replace the production logo until a direction is chosen.

### 3.1 Directions to produce

1. **Monogram:** a "T" whose crossbar subtly forms a downward trend line or arrow. Must read clearly at 16px (favicon).
2. **Tag + pulse:** a price-tag shape combined with a radar/ping motif, suggesting "tracking and alerts".
3. **Wordmark:** custom-styled "Trakora" with one small chart-dip detail replacing or modifying a letter feature.

### 3.2 Deliverables for each direction

Save under `design/logo-options/<direction-name>/`:

- `logo-mark.svg` (symbol only, square viewBox)
- `logo-full.svg` (symbol + wordmark, horizontal)
- `logo-mono-dark.svg` and `logo-mono-light.svg` (single-color versions for light and dark backgrounds)
- Verify each at 16, 32, 64, and 256px and note any legibility issues.

Also create `design/logo-options/preview.html`: a single static page showing all three directions on light and dark backgrounds at multiple sizes, plus inside a mock of the new top bar. This is what the team will review.

### 3.3 SVG requirements

- Clean, hand-readable SVG: a proper `viewBox`, no embedded raster images, no unnecessary groups or editor metadata, no external fonts. Convert text to paths for the wordmark so it renders identically everywhere.
- Use `currentColor` or CSS variables for fills where practical so the mark can be themed.
- Must be an **original design**. Do not imitate existing brands' logos or marks.

### 3.4 Accent color proposal

Propose one accent color to pair with the existing dark navy, with:
- hex values for default, hover, and a light tint (for backgrounds such as the active nav state),
- contrast ratios against white and against the navy,
- a short note on where it should and should not be used.

Present this in `design/logo-options/README.md` along with a short rationale (3-4 sentences) per direction and a recommendation.

### Phase 3 acceptance criteria
- [ ] Three directions delivered with all files listed above.
- [ ] Preview page renders locally with no external requests.
- [ ] Each mark is recognizable at 16px or the limitation is documented.
- [ ] Production logo untouched.

---

## Final report (required)

When finished, write `docs/ui-improvement-report.md` containing:

1. **Summary** of what was done per task (1-2 lines each).
2. **Decisions made** and why (top bar vs. sidebar details, responsive pattern, etc.).
3. **Open questions for the team**, including at minimum: the verified meaning of the three ambiguous columns, whether a Settings page exists or is planned, and which notification channels the backend supports.
4. **Deferred or skipped items** with reasons.
5. **Other problems noticed** but not fixed.
6. **How to verify:** commands to run, URLs/routes to open, and the screenshot locations.

## Suggested task order

1. Phase 1.1 to 1.3 (user block), then 1.4 to 1.6
2. Phase 2.1, 2.2, 2.5, then 2.3, 2.4, 2.6
3. Phase 3 (any time; can be given to a separate agent)
4. Final report
