# US4 Manual Acceptance: File Loading & Validation

## Prerequisites

- Open `index.html` in mobile browser or Chrome DevTools at 360px width
- Have `tests/fixtures/valid-itinerary.json` and `tests/fixtures/invalid-itinerary-missing-fields.json` ready

## Acceptance Scenarios

### Scenario 1: Load valid itinerary file

- [ ] Tap "Load Itinerary" button
- [ ] Select `valid-itinerary.json`
- [ ] Title updates to "Test Trip to Paris"
- [ ] Date range shows "2026-04-01 — 2026-04-03"
- [ ] Day tabs update to Day 1, Day 2, Day 3
- [ ] Day 1 activities: Eiffel Tower, Louvre Museum, Seine River Walk
- [ ] Map shows 2 markers (Eiffel Tower, Louvre) with route line
- [ ] Status shows "Itinerary loaded successfully." in green

### Scenario 2: Load invalid itinerary file

- [ ] First load valid file (to establish baseline content)
- [ ] Tap "Load Itinerary" button
- [ ] Select `invalid-itinerary-missing-fields.json`
- [ ] Red validation error box appears with specific field errors
- [ ] Status shows "Validation failed" in red
- [ ] Previous valid itinerary (Test Trip to Paris) remains visible
- [ ] Day tabs and activities are unchanged from previous valid load

### Scenario 3: Sequential valid file loads

- [ ] Load `valid-itinerary.json`
- [ ] Mark some activities as done
- [ ] Load same or different valid file again
- [ ] UI completely refreshes with new data
- [ ] All activity statuses reset to pending

### Scenario 4: Non-JSON file handling

- [ ] Attempt to load a `.txt` file with non-JSON content
- [ ] Error message about invalid JSON
- [ ] Previous content remains intact
