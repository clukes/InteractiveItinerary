# Quickstart — Interactive Trip Itinerary

## Prerequisites

- Node.js 20+
- npm 10+
- Modern browser (mobile + desktop)

## Setup

1. Install dependencies:
    - `npm install`
2. Start local static server:
3. Open `index.html` in browser and verify default itinerary renders from inline data.
3. Open app in browser and verify default itinerary renders.

## Stage-by-Stage Implementation and Test Plan
- Establish single-file architecture in `index.html` with inline `<style>` and `<script>` blocks (no required external files).
Implementation scope:


Required tests before moving on:

- Render day activity route visualization in-file (SVG/canvas).
- Draw ordered route segments for 2+ map-valid activities.
### Stage 2 — Story P2: Route Map & Google Maps Launch

- Integration: in-file route visualization order matches itinerary activity order.
- Open activity map location in new tab.
- Mark activities with missing map data.

- E2E (Playwright mobile): selecting map point opens expected maps URL intent.
- Manual: disable network and confirm checklist/details still work while map gracefully degrades.
Implementation scope:

- Add done/skipped status controls (mutually exclusive).
Required tests before moving on:


### Stage 4 — Story P4: Reusable File Loading + Validation
- [ ] App is shareable as a single `index.html` file and works without bundling any external local assets.
## End-to-End Verification Commands

- Run unit tests: `npm run test:unit`
- Run integration tests: `npm run test:integration`
- Run mobile E2E: `npm run test:e2e`
- Run all checks before release: `npm run test`

## Human Manual Acceptance Checklist (Final)

- [ ] App is usable at 360px–430px widths without horizontal scrolling for core flows.
- [ ] Day tabs switch cleanly; selected tab is visually distinct; only selected day data appears.
- [ ] Default day is selected on initial load.
- [ ] Empty day shows explicit empty-state text and no stale data.
- [ ] Day map shows activity markers and route order for days with 2+ map-valid activities.
- [ ] Each mapped activity can open Google Maps via link/action.
- [ ] Activities missing map fields are clearly indicated; valid map points still render.
- [ ] Checklist allows done/skipped with mutually exclusive state.
- [ ] If details are expanded and status changes, activity auto-collapses.
- [ ] Expanded details show: name, image, description, maps link, price, tips, photo-spot tips, rating/review summary, review links, website link.
- [ ] Missing optional detail values are clearly labeled as not provided.
- [ ] Status selections remain intact when switching day tabs.
- [ ] Loading a valid itinerary file updates all day/map/checklist/detail UI.
- [ ] Loading an invalid file shows clear validation errors and does not replace prior valid content.
- [ ] Keyboard navigation and focus visibility work for tabs, checklist controls, expandable details, and links.
