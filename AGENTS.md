# AGENTS.md

Guidelines for AI agents working on this repository.

## Itinerary Content

1. **Accuracy** — All itinerary information must be accurate. Double-check names, addresses, descriptions, and any factual claims before committing.
2. **No duplicates** — Do not repeat images or activities unless explicitly asked. Each entry should be unique across the itinerary.
3. **Image relevance** — Every image must depict the actual activity or location it is associated with. Verify the subject of the image matches the itinerary item — do not use generic or loosely related photos. If you can't find an image, don't give a best guess. Suggest some options and ask the user.
4. **Example image style** — Prefer images of people posing, Instagram-style photos that highlight the person as the subject.
5. **Review accuracy** — Reviews must relate to the specific activity. For example, if the visit is to a restaurant inside a hotel, provide reviews for the restaurant, not the hotel.
6. **Opening times & public holidays** — Verify opening times and provide sources. If unsure or if it needs to be checked later, add a note. Check public holidays for the location and include them as a note for the relevant day.
7. **Value-first recommendations** — Prioritise good value options. Look for free or cheap activities. Suggest paid activities only if the value is good. When including a paid activity, provide some cheaper alternatives.
8. **Route planning** — Always check the route to ensure it is linear and makes sense. Minimise backtracking and unnecessary detours.
9. **Quality check on change** — After any itinerary modification, verify the entire itinerary for duplicate images, duplicate activities, and duplicate links. None of these should appear unless explicitly requested. Run `npm run validate:itinerary` and manually scan for duplicates before considering the change complete.

## Images & URLs

9. **Verify links** — All URLs and images must work. Do not commit broken links or images.
10. **Image sourcing** — Any images are acceptable. For publicly accessible images (e.g. Unsplash, Pexels, Wikimedia), link directly to the URL — no need to download or re-host. Only download and store in Cloudflare when the source requires an API key (e.g. Google Maps Place Photos) to avoid ongoing costs. Images do not need to be free — this is a private, non-commercial project.

## Development

11. **Test changes** — Make sure to test all changes. Use a browser to visually confirm changes look correct.
12. **Mobile first** — Keep a mobile-first development approach. Design and test for mobile viewports before desktop.

## Tech Stack

- **Frontend** — Static HTML5 / CSS3 / JavaScript (ES2020+). No build step; served as-is.
- **Maps** — Leaflet for map rendering (`assets/scripts/modules/map-rendering.js`, `map-interaction.js`).
- **Hosting** — GitHub Pages (static) + Cloudflare Worker for authenticated itinerary delivery (`cloudflare/worker.js`).
- **Images CDN** — Cloudflare Pages project `itinerary-images` (`npm run deploy:images`).
- **Testing** — Vitest (unit + integration), Playwright (E2E, mobile viewports only — Pixel 5, iPhone 13).
- **Validation** — JSON Schema (`specs/001-interactive-itinerary/contracts/itinerary-file.schema.json`) + inline semantic validation (`assets/scripts/modules/validation.js`).

## Project Structure

```
index.html              # Single-page app entry point
assets/
  scripts/app.js        # Main application script
  scripts/modules/      # map-rendering, map-interaction, validation
  styles/app.css        # All styles
  data/                 # Sample itinerary JSON
cloudflare/
  worker.js             # Cloudflare Worker (auth + KV itinerary delivery)
scripts/                # Dev tooling (dev-server, image scripts, validation)
specs/                  # Feature specs, JSON schema, task checklists
tests/
  unit/                 # Vitest unit tests
  integration/          # Vitest integration tests (jsdom)
  e2e/                  # Playwright E2E tests (mobile viewports)
  fixtures/             # Test fixture JSON files
private/                # Git-ignored. Real itinerary data + images
plans/                  # Git-ignored. Fix plans, todos
```

## Running & Testing

```bash
npm install                    # Install dependencies
npm run dev                    # Dev server (port 3000, live-reload, serves local itinerary)
npm run dev:all                # Dev server + Cloudflare Worker together
npm run dev:worker             # Local Cloudflare Worker via wrangler (optional)
npm run test:unit              # Vitest unit tests
npm run test:integration       # Vitest integration tests
npm run test:e2e               # Playwright E2E (starts local server automatically)
npm test                       # All tests (unit → integration → E2E)
npm run validate:itinerary     # Validate itinerary JSON against schema
```

The dev server handles `/auth-itinerary` itself — it reads the itinerary JSON directly from `private/` so changes are available instantly without deploying. No need to run the worker (`dev:worker`) for itinerary testing.

### Local Dev Password

The dev password is stored in `private/.dev-password` (git-ignored). Currently set to `dev`. If the file is absent, any password is accepted.

Do **not** use `file://` URLs — always serve via HTTP.

## Itinerary Data Format

Itinerary JSON must conform to `specs/001-interactive-itinerary/contracts/itinerary-file.schema.json` (schema version `"1.0"`).

Required top-level fields: `schemaVersion`, `tripId`, `title`, `days`.

Each activity requires: `activityId`, `order`, `name`, `description`, `image` (`url` + `alt`), `location` (`mapsUrl`, optional `lat`/`lng`), `price`, `tips`, `photoSpotTips`, `ratingSummary`, `reviewLinks`, `websiteUrl`.

Run `npm run validate:itinerary` after any itinerary JSON change.

## Deployment

**Ask the user before doing any deployment.**

- **Static site** — Push to GitHub Pages (or serve with any static host).
- **Worker** — When `cloudflare/worker.js` is modified, deploy before handoff:
    ```bash
    npm run deploy:worker -- <worker-name> [environment]
    ```
    Requires `npx wrangler login` and configured secrets (`ITINERARY_PASSWORD`, `ITINERARY_KV`).
- **Images** — Upload to Cloudflare Pages:
    ```bash
    npm run deploy:images
    ```

## Code Conventions

- Vanilla JavaScript (ES2020+). No frameworks or transpilers.
- `"use strict"` in IIFE modules; app code uses the `window.__itineraryModules` namespace.
- Mobile-first CSS — primary viewport target is 360 px–430 px.
- Keyboard accessibility is required: focus states, tab navigation, `aria-*` attributes.
- Keep the app self-contained — no required backend at runtime (the worker is optional for private itineraries).

## Private & Ignored Paths

The `private/` and `plans/` directories are git-ignored. Real itinerary data lives in:

- `private/seville-itinerary.json`
- `private/local-itineraries/seville-itinerary.private.json`
- `private/images/` (uploaded to Cloudflare Pages)

Never commit secrets, `.env` files, or real itinerary data to the repository.
