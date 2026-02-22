# Interactive Trip Itinerary

A mobile-first, standalone HTML interactive trip itinerary with day tabs, per-day route visualization, activity checklists, expandable details, and reusable JSON file loading.

## Quick Start

1. **Open directly**: Open `index.html` in any modern browser — it works standalone with embedded demo data.
2. **Load your own trip**: Click "Load Itinerary" and select a JSON file matching the [itinerary schema](specs/001-interactive-itinerary/contracts/itinerary-file.schema.json).

## Features

- **Day Navigation**: Switch between trip days via tabs; only the selected day's content is displayed
- **Route Map**: SVG-rendered route visualization with numbered markers for activities with coordinates
- **Google Maps Integration**: Open any activity location directly in Google Maps
- **Activity Checklist**: Mark activities as done or skipped with mutually exclusive status
- **Expandable Details**: View full activity info including image, description, price, tips, photo tips, ratings, reviews, and website
- **File Loading**: Load itinerary JSON files with schema + semantic validation and clear error feedback
- **Accessibility**: Full keyboard support, ARIA tabs/disclosure, visible focus states

## Development

### Prerequisites
- Node.js 20+
- npm 10+

### Setup
```bash
npm install
npx playwright install chromium webkit
```

### Running Tests
```bash
npm run test:unit        # Unit tests (Vitest)
npm run test:integration # Integration tests (Vitest + jsdom)
npm run test:e2e         # End-to-end tests (Playwright mobile viewports)
npm run test             # All tests in sequence
```

## Portability

The entire application is a **single `index.html` file** with inline CSS and JavaScript. No build step, no bundling, no external runtime dependencies. Copy the file anywhere and it works.

## Itinerary File Format

See the full JSON schema at [itinerary-file.schema.json](specs/001-interactive-itinerary/contracts/itinerary-file.schema.json). Key structure:

```json
{
  "schemaVersion": "1.0",
  "tripId": "my-trip",
  "title": "My Trip",
  "dateRange": { "start": "2026-01-01", "end": "2026-01-03" },
  "days": [
    {
      "dayId": "day-1",
      "dayNumber": 1,
      "label": "Day 1",
      "activities": [...]
    }
  ]
}
```

## License

Private project.
