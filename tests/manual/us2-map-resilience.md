# US2 Manual Acceptance: Map Route & Google Maps Launch

## Prerequisites
- Open `index.html` in mobile browser or Chrome DevTools at 360px width
- Default itinerary loaded

## Acceptance Scenarios

### Scenario 1: Route rendering
- [ ] Select Day 1 (3 activities, 2 with coordinates)
- [ ] Route map section shows SVG with numbered markers
- [ ] Dashed route line connects markers in itinerary order (1→2)
- [ ] Seine River Walk marked as "Map unavailable" in legend

### Scenario 2: Google Maps launch
- [ ] Tap marker #1 (Senso-ji Temple) on map
- [ ] Browser opens Google Maps URL in new tab
- [ ] Expand any activity and tap "Open in Google Maps" link
- [ ] Correct location opens in new tab

### Scenario 3: Missing map data handling
- [ ] Activity without coordinates (Seine River Walk) still visible in checklist
- [ ] "No map" badge shown on activity card header
- [ ] Map legend shows "Map unavailable" for that activity
- [ ] Valid map points still render normally

### Scenario 4: Single activity day
- [ ] Select Day 2 (2 activities with coords)
- [ ] Markers shown, route line connects them
- [ ] A day with only 1 mapped activity shows marker but no route line

## Resilience Check
- [ ] Disable network (airplane mode / DevTools offline)
- [ ] Checklist and activity details still fully usable
- [ ] Map area degrades without blocking navigation
- [ ] No JavaScript errors in console
