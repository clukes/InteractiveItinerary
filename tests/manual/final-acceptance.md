# Final Manual Acceptance Checklist

Aligned with `quickstart.md` requirements. Test at 360px and 430px viewport widths.

## Core Functionality

- [ ] App is usable at 360px–430px widths without horizontal scrolling for core flows
- [ ] Day tabs switch cleanly; selected tab is visually distinct; only selected day data appears
- [ ] Default day is selected on initial load
- [ ] Empty day shows explicit empty-state text and no stale data
- [ ] Day map shows activity markers and route order for days with 2+ map-valid activities
- [ ] Each mapped activity can open Google Maps via link/action
- [ ] Activities missing map fields are clearly indicated; valid map points still render
- [ ] Checklist allows done/skipped with mutually exclusive state
- [ ] If details are expanded and status changes, activity auto-collapses
- [ ] Expanded details show: name, image, description, maps link, price, tips, photo-spot tips, rating/review summary, review links, website link
- [ ] Missing optional detail values are clearly labeled as not provided
- [ ] Status selections remain intact when switching day tabs
- [ ] Loading a valid itinerary file updates all day/map/checklist/detail UI
- [ ] Loading an invalid file shows clear validation errors and does not replace prior valid content
- [ ] Keyboard navigation and focus visibility work for tabs, checklist controls, expandable details, and links

## Portability

- [ ] App runs correctly when served over HTTP static hosting (local server or production static host)
- [ ] Relative paths resolve for `assets/styles/app.css`, `assets/scripts/app.js`, and `assets/data/default-itinerary.json`
- [ ] App works when hosted under a subpath (GitHub Pages project site) without root-absolute path assumptions

## Performance

- [ ] Day switching feels instant (< 100ms perceived)
- [ ] Map rendering updates within 1.5s for dense days
- [ ] Initial interactive state < 2s on mid-range phone

## Accessibility

- [ ] Tab navigation works with keyboard (Arrow keys, Enter/Space)
- [ ] All interactive elements have visible focus states
- [ ] Images have alt text
- [ ] External links have descriptive labels
- [ ] aria-selected, aria-expanded, aria-controls attributes are correct
