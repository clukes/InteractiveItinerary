## Plan: Multi-file GitHub Pages Refactor (EXECUTED)

This refactor will migrate the app from a monolithic [index.html](index.html) into a multi-file static structure designed for GitHub Pages (HTTP-only), while keeping behavior and test coverage intact. Based on your decisions, scope includes code split plus test and documentation updates, and default itinerary data will move into JSON now. The safest path is a phased extraction: first establish stable external CSS/JS/data loading with strictly relative paths, then preserve existing public runtime hooks used by tests, then update test harnesses that currently parse inline script from HTML. This minimizes regressions in app UX and CI while aligning repo docs/specs away from the old single-file requirement.

**Steps**
1. Create target static layout and move assets: keep [index.html](index.html) as shell; add [assets/styles/app.css](assets/styles/app.css), [assets/scripts/app.js](assets/scripts/app.js), and [assets/data/default-itinerary.json](assets/data/default-itinerary.json).  
2. Extract inline CSS from [index.html](index.html) into [assets/styles/app.css](assets/styles/app.css) and replace with a relative stylesheet link; ensure no absolute root paths are introduced.  
3. Extract inline JS from [index.html](index.html) into [assets/scripts/app.js](assets/scripts/app.js), preserving all current window-exposed test hooks and initialization semantics used today by tests and E2E.  
4. Move in-file default data from script in [index.html](index.html) to [assets/data/default-itinerary.json](assets/data/default-itinerary.json), then update bootstrap in [assets/scripts/app.js](assets/scripts/app.js) to load it via relative fetch with graceful failure handling.  
5. Update unit/integration test strategy that currently reads inline HTML script in [tests/unit/itinerary-validator.test.js](tests/unit/itinerary-validator.test.js#L15), [tests/unit/checklist-state.test.js](tests/unit/checklist-state.test.js#L22), [tests/integration/day-navigation.test.js](tests/integration/day-navigation.test.js#L22), [tests/integration/file-load-validation.test.js](tests/integration/file-load-validation.test.js#L32), and [tests/integration/map-route-rendering.test.js](tests/integration/map-route-rendering.test.js#L22) so they load/execute external JS deterministically.  
6. Verify Playwright remains base-path safe by reviewing root navigation assumptions in [playwright.config.cjs](playwright.config.cjs#L11-L26), [tests/e2e/mobile-trip-flow.spec.cjs](tests/e2e/mobile-trip-flow.spec.cjs#L10), and [tests/e2e/itinerary-extended.spec.cjs](tests/e2e/itinerary-extended.spec.cjs#L50), then adjust only where needed for relative/static hosting compatibility.  
7. Update documentation and product artifacts to remove single-file assertions and reflect multi-file architecture: [README.md](README.md#L40), [README.md](README.md#L61), [specs/001-interactive-itinerary/plan.md](specs/001-interactive-itinerary/plan.md#L26), [specs/001-interactive-itinerary/plan.md](specs/001-interactive-itinerary/plan.md#L71), [specs/001-interactive-itinerary/quickstart.md](specs/001-interactive-itinerary/quickstart.md#L19), and [tests/manual/final-acceptance.md](tests/manual/final-acceptance.md#L25-L27).  
8. Run focused then full verification, fixing only migration-related failures and preserving current UX/contract behavior.

**Execution Checklist (Progress Tracking)**

Overall Progress: **8/8 complete (100%)**

| # | Status | Task | Progress | Owner | Notes |
|---|---|---|---|---|---|
| 1 | ✅ Complete | Create multi-file layout and add initial assets | 100% | Copilot | Added `assets/styles`, `assets/scripts`, `assets/data` |
| 2 | ✅ Complete | Extract CSS from [index.html](index.html) to [assets/styles/app.css](assets/styles/app.css) | 100% | Copilot | `index.html` now links stylesheet via relative path |
| 3 | ✅ Complete | Extract JS from [index.html](index.html) to [assets/scripts/app.js](assets/scripts/app.js) | 100% | Copilot | Preserved existing `window.__*` test hooks |
| 4 | ✅ Complete | Move default itinerary into [assets/data/default-itinerary.json](assets/data/default-itinerary.json) and wire bootstrap fetch | 100% | Copilot | Added graceful default-load error UI/status handling |
| 5 | ✅ Complete | Update unit/integration tests for external JS loading | 100% | Copilot | JSDOM now evaluates external JS deterministically |
| 6 | ✅ Complete | Validate and adjust Playwright base-path behavior | 100% | Copilot | Existing `page.goto("/")` + relative asset paths verified |
| 7 | ✅ Complete | Update docs/spec/manual references to multi-file architecture | 100% | Copilot | README/spec/quickstart/manual updated |
| 8 | ✅ Complete | Run focused and full verification suite, fix migration-only regressions | 100% | Copilot | Unit/Integration/E2E all passing |

Legend: ⬜ Not Started · 🟨 In Progress · ✅ Complete · ⛔ Blocked

**Quick Tick List**
- [x] Task 1 complete
- [x] Task 2 complete
- [x] Task 3 complete
- [x] Task 4 complete
- [x] Task 5 complete
- [x] Task 6 complete
- [x] Task 7 complete
- [x] Task 8 complete

**Verification**
- Run unit and integration tests first via package scripts in [package.json](package.json).  
- Run Playwright E2E using existing config in [playwright.config.cjs](playwright.config.cjs).  
- Manually validate static hosting flow from [specs/001-interactive-itinerary/quickstart.md](specs/001-interactive-itinerary/quickstart.md) and manual scenarios in [tests/manual](tests/manual).  
- Confirm GitHub Pages safety by checking that all internal asset/data references are relative and load under a project subpath.

**Verification Results**
- `npm run test:unit` ✅ passed
- `npm run test:integration` ✅ passed
- `npm run test:e2e` ✅ passed (96 tests)

**Decisions**
- Portability: HTTP-only support is accepted; file:// compatibility is intentionally dropped.  
- Scope: tests and docs are included in this same refactor effort.  
- Data source: default itinerary moves to JSON during this migration, not deferred.