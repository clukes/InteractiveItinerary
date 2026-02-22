# US3 Manual Acceptance: Checklist & Activity Details

## Prerequisites
- Open `index.html` in mobile browser or Chrome DevTools at 360px width
- Default itinerary loaded, Day 1 selected

## Acceptance Scenarios

### Scenario 1: Done/Skipped status
- [ ] Tap "✓ Done" on Senso-ji → card shows green left border, name has strikethrough
- [ ] Tap "✗ Skip" on Skytree → card shows orange left border, name has strikethrough
- [ ] Tap "✓ Done" on Senso-ji again → status reverts to pending (no border/strikethrough)
- [ ] Tap "✗ Skip" then "✓ Done" on same activity → status is "done" (mutually exclusive)

### Scenario 2: Auto-collapse on status change
- [ ] Expand Senso-ji (tap activity header)
- [ ] Verify details panel is visible (image, description, etc.)
- [ ] Tap "✓ Done" while expanded → details auto-collapse
- [ ] Activity can be re-expanded by tapping header again

### Scenario 3: Expanded details show all required fields
- [ ] Expand Eiffel Tower (fully populated activity in test fixture)
- [ ] Verify visible: **Name** (in header), **Image**, **Description**
- [ ] Verify visible: **Location** (Google Maps link), **Price**
- [ ] Verify visible: **Tips** (list), **Photo Spot Tips** (list)
- [ ] Verify visible: **Rating** summary, **Reviews** (links), **Website** (link)

### Scenario 4: Missing optional field labeling
- [ ] Expand Akihabara (null price, null website, empty reviews)
- [ ] Price shows "Not provided" in italics
- [ ] Website shows "Not provided" in italics
- [ ] Reviews shows "No reviews available"

### Scenario 5: Status persistence across day switches
- [ ] Mark Senso-ji as "Done" on Day 1
- [ ] Switch to Day 2
- [ ] Switch back to Day 1
- [ ] Senso-ji should still show "Done" status

## Keyboard/Touch Accessibility
- [ ] Tab to activity header, press Enter → expands details
- [ ] Tab to Done/Skip buttons, press Enter → toggles status
- [ ] All controls have visible focus ring
- [ ] Touch targets are at least 44×44px effective area
