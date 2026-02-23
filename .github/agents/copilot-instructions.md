# InteractiveItinerary Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-02-22

## Active Technologies

- HTML5, CSS3, JavaScript (ES2023) + Browser-native APIs for rendering and file loading; npm tooling for local dev/testing, Playwright (E2E), Vitest (unit) (001-interactive-itinerary)
- In-memory runtime state + itinerary JSON files loaded by user (no backend) (001-interactive-itinerary)
- JavaScript (ES2020+), HTML5, CSS3 — single-file inline architecture + None at runtime (self-contained HTML). Dev: Vitest 3.x, Playwright 1.50+, jsdom 25.x, serve 14.x (001-interactive-itinerary)
- N/A — all state is in-memory for current session; itinerary data loaded from JSON files (001-interactive-itinerary)

- HTML5, CSS3, JavaScript (ES2023) + Leaflet (map rendering), npm tooling for local dev/testing, Playwright (E2E), Vitest (unit) (001-interactive-itinerary)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

npm test && npm run lint

## Code Style

HTML5, CSS3, JavaScript (ES2023): Follow standard conventions

## Recent Changes

- 001-interactive-itinerary: Added JavaScript (ES2020+), HTML5, CSS3 — single-file inline architecture + None at runtime (self-contained HTML). Dev: Vitest 3.x, Playwright 1.50+, jsdom 25.x, serve 14.x
- 001-interactive-itinerary: Added HTML5, CSS3, JavaScript (ES2023) + Browser-native APIs for rendering and file loading; npm tooling for local dev/testing, Playwright (E2E), Vitest (unit)

- 001-interactive-itinerary: Added HTML5, CSS3, JavaScript (ES2023) + Leaflet (map rendering), npm tooling for local dev/testing, Playwright (E2E), Vitest (unit)

<!-- MANUAL ADDITIONS START -->

- Deployment rule: whenever `cloudflare/worker.js` is modified, run the deploy command before handoff.
- Deploy command: `npm run deploy:worker -- <worker-name> [environment]`
- Minimum verification after worker changes: confirm deploy command starts successfully and report result in final summary.
  <!-- MANUAL ADDITIONS END -->
