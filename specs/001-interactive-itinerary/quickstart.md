# Quickstart — Interactive Trip Itinerary

## Prerequisites
- Node.js 20+
- npm 10+
- Modern browser (mobile + desktop)

## Setup
1. Install dependencies:
   - `npm install`
2. Start local static server:
   - `npm run dev`
3. Open app in browser and verify default itinerary renders.

## Stage-by-Stage Implementation and Test Plan

### Stage 1 — Story P1: Day Tabs & Per-Day Rendering
Implementation scope:
- Build day tab bar with active-state semantics.
- Ensure only selected day content is rendered.
- Add empty-day state messaging.

Required tests before moving on:
- Unit: tab selection state reducer/logic.
- Integration: switching tabs updates checklist/map container and clears stale day content.
- Manual: on mobile viewport (390x844), first day auto-selects and remains readable with thumb interactions.

### Stage 2 — Story P2: Route Map & Google Maps Launch
Implementation scope:
- Render day activity markers.
- Draw ordered route polyline for 2+ map-valid activities.
- Open activity map location in new tab.
- Mark activities with missing map data.

Required tests before moving on:
- Unit: route segment derivation from ordered activities.
- Integration: map marker count and polyline ordering match itinerary data.
- E2E (Playwright mobile): selecting map point opens expected maps URL intent.
- Manual: disable network and confirm checklist/details still work while map gracefully degrades.

### Stage 3 — Story P3: Checklist State + Expandable Details
Implementation scope:
- Add done/skipped status controls (mutually exclusive).
- Preserve per-activity status across day switches during session.
- Build expandable details panel with required content categories.
- Auto-collapse expanded item after status change.

Required tests before moving on:
- Unit: status transition logic and auto-collapse trigger.
- Integration: expanded details include all required categories and clear missing-value placeholders.
- E2E (Playwright mobile): done/skipped toggles persist across day tab changes.
- Accessibility manual: keyboard tab/enter/space works for tabs and expand/collapse with visible focus.

### Stage 4 — Story P4: Reusable File Loading + Validation
Implementation scope:
- Add file picker and parser for itinerary JSON.
- Validate schema and semantic ordering constraints.
- Show human-readable error messages without replacing current valid view on invalid load.
- Support loading alternate valid itinerary in-session.

Required tests before moving on:
- Unit: validator catches malformed required fields and ordering conflicts.
- Integration: loading valid file re-renders days/map/details.
- Integration: invalid file surfaces errors and retains last valid itinerary UI.
- E2E (Playwright mobile): switch between two valid itinerary files and verify full UI update.

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
