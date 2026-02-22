# US1 Manual Acceptance: Day Navigation

## Prerequisites

- Open `index.html` in mobile browser or Chrome DevTools at 360px width
- Default itinerary should load with Day 1, Day 2, Day 3 tabs

## Acceptance Scenarios

### Scenario 1: Tab switching shows only selected day's content

- [ ] Tap "Day 1" tab → see 3 activities (Senso-ji, Skytree, Akihabara)
- [ ] Tap "Day 2" tab → see 1 activity (Meiji Shrine, Shibuya Crossing)
- [ ] Verify Day 1 activities are NOT visible while Day 2 is selected
- [ ] Selected tab has a distinct visual treatment (blue underline)

### Scenario 2: Default day selected on load

- [ ] Reload page
- [ ] Day 1 is automatically selected and its content is visible
- [ ] Day 1 tab shows `aria-selected="true"` (inspect element)

### Scenario 3: Empty day state

- [ ] Tap "Day 3" tab (no activities in demo itinerary)
- [ ] See "No activities planned for Day 3" message
- [ ] No stale activities from previous day visible
- [ ] No map section shown

## Keyboard Navigation

- [ ] Use Tab key to focus day tabs
- [ ] Use Arrow Right/Left to move between tabs
- [ ] Press Enter/Space to select a tab
- [ ] Visible focus ring on focused tab
