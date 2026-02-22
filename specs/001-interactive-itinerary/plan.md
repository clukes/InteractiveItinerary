# Implementation Plan: Interactive Trip Itinerary

**Branch**: `001-interactive-itinerary` | **Date**: 2026-02-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-interactive-itinerary/spec.md`

## Summary

Build a mobile-first, single-file interactive trip itinerary web app with day tabs, per-day SVG route maps, activity checklists with done/skipped status, expandable activity details, and reusable JSON file loading with strict validation. Implemented as a self-contained HTML file with inline CSS and JavaScript, requiring no backend services. Tested with Vitest (unit/integration) and Playwright (mobile E2E).

## Technical Context

**Language/Version**: JavaScript (ES2020+), HTML5, CSS3 — single-file inline architecture  
**Primary Dependencies**: None at runtime (self-contained HTML). Dev: Vitest 3.x, Playwright 1.50+, jsdom 25.x, serve 14.x  
**Storage**: N/A — all state is in-memory for current session; itinerary data loaded from JSON files  
**Testing**: Vitest (unit + integration via jsdom), Playwright (mobile E2E with Pixel 5 + iPhone 13 device emulation)  
**Target Platform**: Mobile browsers (primary: 360px–430px viewport), modern desktop browsers (secondary)  
**Project Type**: Static single-file web app (portable HTML)  
**Performance Goals**: Day-switch interactions <100ms; initial render with default itinerary <500ms on mobile  
**Constraints**: Single HTML file delivery; no external runtime dependencies; offline-capable for core navigation/checklist; <100KB total file size  
**Scale/Scope**: Single traveler, 1–10 day trips, 1–20 activities per day

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Portable Delivery Gate**: ✅ PASS — App is a single `index.html` file with inline CSS/JS. No backend, no external runtime assets. Can be shared as a file and opened directly in any mobile browser.
- **Mobile-First Gate**: ✅ PASS — Primary viewport targets 360px–430px. Touch-first interactions (tap to switch tabs, tap to expand, tap status buttons). CSS uses mobile-first responsive layout with no horizontal scroll at target widths. Tested via Playwright with Pixel 5 and iPhone 13 device emulation.
- **Itinerary Completeness Gate**: ✅ PASS — Scope covers: day navigation tabs, per-day SVG route maps with ordered markers, activity checklists with done/skipped status, expandable details (name, image, description, maps link, price, tips, photo-spot tips, rating, review links, website), and reusable JSON file loading with validation. No intentional omissions.
- **Simplicity & Performance Gate**: ✅ PASS — Zero runtime dependencies. Single file <50KB. No build step required. Day switches are instant (re-render from in-memory state). SVG route computed client-side from coordinates. No external tile services required for core map rendering.
- **Accessibility Gate**: ✅ PASS — WAI-ARIA tab pattern for day navigation with keyboard arrow/Home/End support. Button-driven disclosure for activity expand/collapse with `aria-expanded`. Status buttons with `aria-pressed` and descriptive `aria-label`. Visible focus outlines (3px solid #2563eb). SVG map has `role="img"` and `aria-label`. Map markers have `tabindex="0"` and keyboard activation. File status has `aria-live="polite"`. Validation errors have `role="alert"`.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
index.html               # Single-file app (HTML + inline CSS + inline JS)
package.json             # Dev tooling metadata and test scripts
vitest.config.js         # Vitest unit/integration test configuration
playwright.config.cjs    # Playwright E2E test configuration (Mobile Chrome + Safari)

tests/
├── fixtures/
│   ├── valid-itinerary.json
│   └── invalid-itinerary-missing-fields.json
├── unit/
│   ├── checklist-state.test.js
│   └── itinerary-validator.test.js
├── integration/
│   ├── day-navigation.test.js
│   ├── file-load-validation.test.js
│   └── map-route-rendering.test.js
└── e2e/
    ├── mobile-trip-flow.spec.cjs
    ├── itinerary-extended.spec.cjs
    └── screenshots/
```

**Structure Decision**: Single-file static web app. All application code (HTML, CSS, JavaScript) lives in `index.html`. Test infrastructure uses standard Node.js tooling (Vitest + Playwright) in a `tests/` directory organized by test type.

## Complexity Tracking

> No Constitution Check violations. All gates pass without exceptions.
