# Interactive Trip Itinerary

A mobile-first, single-file web app for browsing a multi-day itinerary with maps, checklists, and rich activity details.

## Screenshot Tour

### Day view + route map

![Day 1 default view showing day tabs, route map, and activity cards](tests/e2e/screenshots/day1-default.png)

### Checklist progress on another day

![Day 2 view with completed checklist state](tests/e2e/screenshots/day2-with-done.png)

### Activity details expanded

![Expanded activity panel with details, tips, and links](tests/e2e/screenshots/activity-expanded.png)

### Custom itinerary loaded

![Loaded Paris itinerary from JSON file](tests/e2e/screenshots/paris-loaded.png)

### Validation feedback for invalid files

![Validation errors shown after loading an invalid itinerary file](tests/e2e/screenshots/validation-errors.png)

## What It Does

- Day-by-day tabs with keyboard-accessible navigation
- Visual route map with numbered stops and map links
- Per-activity checklist with done/skip state
- Expandable details with image, notes, ratings, and website
- JSON itinerary loading with schema and semantic validation
- Graceful empty-day support

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Start a local server:

```bash
npx serve -l 3000 -s .
```

3. Open:

```text
http://localhost:3000
```

You can also open `index.html` directly in a browser for basic use.

## Load Your Own Itinerary

Use **Load Itinerary** in the app and select a JSON file that matches the schema:

- [Schema: itinerary-file.schema.json](specs/001-interactive-itinerary/contracts/itinerary-file.schema.json)
- [Example: valid-itinerary.json](tests/fixtures/valid-itinerary.json)
- [Example: seville-itinerary.json](seville-itinerary.json)

## Testing

```bash
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test
```

## Tech Notes

- App is implemented in a single `index.html` file (inline CSS + JS)
- No build step required for runtime
- End-to-end coverage includes mobile viewports via Playwright

## License

Private project.
