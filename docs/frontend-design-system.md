# Trakora Frontend Design System Summary

*Architecture and Design System guide for the Trakora frontend application.*

> **Note:** This document serves as the single source of truth for developing UI components, pages, and handling application state. It outlines the core technologies, design tokens, and structural conventions used across the project.

---

## 1. Design Principles (the big picture)

1. **Vanilla CSS Modules.** No external UI libraries or utility frameworks like Tailwind CSS are used. Every component relies on pure CSS Modules (`*.module.css`) combined with global CSS variables.
2. **Centralized Design Tokens.** All colors, typography, spacing, and shadows are defined as CSS Custom Properties in `globals.css`. Hardcoded hex values or fixed pixels in component styles are strictly prohibited.
3. **Consistent UX States.** Every data-fetching view explicitly handles three states: Loading, Error, and Empty.
4. **Dashboard Layout.** The application follows a classic dashboard structure with a fixed sidebar for navigation and a main scrolling content area.
5. **Strict Component Coupling.** Every `.tsx` component must be paired with its exact `.module.css` counterpart in the same directory.

---

## 2. Color

| Role | Variable | Estimated value | Where it's used |
|---|---|---|---|
| Accent (primary) | `--primary-color` | `#232F3E` | Primary buttons, logo, key highlights (Amazon dark blue) |
| Accent (hover) | `--primary-hover` | `#131921` | Hover state for primary buttons |
| Background (main) | `--bg-main` | `#f9fafb` | Entire page background |
| Background (surface)| `--bg-surface` | `#ffffff` | Cards, tables, elevated surfaces |
| Background (sidebar)| `--bg-sidebar` | `#ffffff` | Sidebar navigation background |
| Text primary | `--text-primary` | `#111827` | Headings, primary content, navigation |
| Text secondary | `--text-secondary` | `#6b7280` | Subheadings, descriptions, secondary data |
| Text muted | `--text-tertiary` | `#9ca3af` | Placeholders, disabled text |
| Border | `--border-color` | `#e5e7eb` | Card borders, input borders, table borders |
| Divider | `--border-light` | `#f3f4f6` | Subtle dividers and separators |

### Status Colors
**Rule:** Status colors are always paired with a corresponding background tint (`-bg`) for pills and badges.

| Status | Text/Border | Background | Application |
|---|---|---|---|
| Success | `--status-success` (`#10b981`) | `--status-success-bg` | "Good price" badges, success toasts |
| Warning | `--status-warning` (`#f59e0b`) | `--status-warning-bg` | Alerts, "Fake discount" warnings |
| Error | `--status-error` (`#ef4444`) | `--status-error-bg` | Error states, destructive actions |
| Neutral | `--status-neutral` (`#6b7280`) | `--status-neutral-bg` | Missing data, default badges |

---

## 3. Typography and Layout

- **Font Family:** `--font-family-main` (Inter, falling back to system sans-serif).
- **Sidebar Sizing:** `--sidebar-width` (240px) and `--sidebar-collapsed-width` (72px).
- **Shadows:** `--shadow-sm` and `--shadow-md` are used to elevate cards, popovers, and floating elements.

---

## 4. Components & UX States

### Component Pattern
- **Interfaces:** Always define a strict TypeScript interface for component props.
- **Accessibility (A11y):** Any interactive element that isn't natively a `<button>` or `<a>` must include `role="button"`, `tabIndex={0}`, and an `onKeyDown` handler.
- **Event Bubbling:** If a button is nested inside a clickable row/card, use `e.stopPropagation()` on the button to prevent unintended row clicks.

### The 3 Mandatory UX States
Every page or component that relies on asynchronous data must handle:
1. **`isLoading`:** Show a loading spinner, skeleton, or "Loading data..." message. Never show a blank screen.
2. **`error`:** Display a friendly error message alongside a "Try again" button to re-trigger the fetch or reload the page.
3. **`emptyState`:** When the response is successful but empty, clearly state why (e.g., "No products found") and provide a call to action (e.g., "Clear filters" or "Add a product").

---

## 5. Folder Structure & Architecture

```text
frontend/src/
├── components/          # Reusable UI components & shared layouts
│   ├── Layout.tsx
│   ├── Layout.module.css
│   ├── ProductRow.tsx
│   └── ProductRow.module.css
├── pages/               # Page-level components corresponding to Routes
│   ├── WatchlistPage.tsx
│   └── WatchlistPage.module.css
├── styles/
│   └── globals.css      # Design tokens and global CSS reset
├── assets/              # Static assets (images, SVGs)
└── App.tsx              # Main application router
```

---

## 6. Navigation Flow

- **App Shell:** `App.tsx` handles the routing, wrapping everything in the `Layout.tsx` which contains the `Sidebar.tsx` and main content area.
- **Sidebar Links:** Use React Router's `<NavLink>` for sidebar items to automatically apply active styling (`isActive`).
- **Programmatic Navigation:** Use the `useNavigate()` hook for redirecting users after actions (e.g., clicking a table row to view `navigate('/detail/${id}')`).

---

## 7. Checklist for Developing New Features

- [ ] I have used CSS Modules (`Component.module.css`) instead of inline styles or Tailwind.
- [ ] I have used CSS variables (`var(--primary-color)`) instead of hardcoding hex colors.
- [ ] I have explicitly handled `isLoading`, `error`, and `emptyState` for API calls.
- [ ] I have created a strongly typed interface for my component's props.
- [ ] I have added `e.stopPropagation()` for interactive elements nested inside clickable containers.
- [ ] I have formatted currencies properly using `Intl.NumberFormat('vi-VN')`.
