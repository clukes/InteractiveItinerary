# Tasks: Interactive Trip Itinerary

**Input**: Design documents from `/specs/001-interactive-itinerary/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/itinerary-file.schema.json`, `quickstart.md`

**Tests**: Tests are required by the feature spec and quickstart, so each phase includes test gates that must pass before continuing.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description with file path`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (`[US1]`, `[US2]`, `[US3]`, `[US4]`)
- Each task includes a required **Test** and **Acceptance** gate in-line; complete the gate before moving to the next task.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize local tooling and baseline files for single-file app + automated tests.

- [x] T001 Create project npm metadata and scripts in `package.json`; Test: run `npm install` then `npm run test -- --help`; Acceptance: `package.json` defines `test:unit`, `test:integration`, `test:e2e`, and `test` scripts.
- [x] T002 [P] Add Vitest configuration in `vitest.config.js`; Test: run `npm run test:unit -- --run`; Acceptance: Vitest boots and discovers unit tests without config errors.
- [x] T003 [P] Add Playwright configuration in `playwright.config.js`; Test: run `npm run test:e2e -- --list`; Acceptance: Playwright lists specs with mobile project(s) configured.
- [x] T004 [P] Create test directory scaffolding files in `tests/unit/.gitkeep`, `tests/integration/.gitkeep`, and `tests/e2e/.gitkeep`; Test: run `npm run test`; Acceptance: test runner resolves all test directories with no missing-path failures.
- [x] T005 Establish single-file baseline shell and mobile viewport metadata in `index.html`; Test: manual open in browser at 360px width; Acceptance: page loads with no horizontal scroll and includes `meta viewport`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build shared validation/state/render foundations required by every user story.

**⚠️ CRITICAL**: No user story implementation starts until this phase passes.

- [x] T006 Implement itinerary JSON schema validation harness using `contracts/itinerary-file.schema.json` in `tests/unit/itinerary-validator.test.js`; Test: run `npm run test:unit -- tests/unit/itinerary-validator.test.js`; Acceptance: tests assert valid sample passes and malformed required fields fail with readable reasons.
- [x] T007 [P] Add canonical valid/invalid fixture files in `tests/fixtures/valid-itinerary.json` and `tests/fixtures/invalid-itinerary-missing-fields.json`; Test: run `npm run test:unit -- tests/unit/itinerary-validator.test.js`; Acceptance: fixtures are consumed by tests and represent schema-compliant + schema-breaking inputs.
- [x] T008 Implement shared in-memory app state model (`selectedDayId`, activity statuses, expanded item) in `index.html`; Test: run `npm run test:unit -- tests/unit/checklist-state.test.js`; Acceptance: state transitions match `pending/done/skipped` exclusivity and single selected day invariant.
- [x] T009 [P] Create accessibility and focus baseline for tabs/disclosure controls in `index.html`; Test: run keyboard-only manual check from `quickstart.md`; Acceptance: tab navigation, visible focus states, and Enter/Space activation work for core controls.
- [x] T010 Add resilient external-link helpers and missing-data labeling primitives in `index.html`; Test: run `npm run test:integration -- tests/integration/file-load-validation.test.js`; Acceptance: missing optional fields/maps data are rendered as explicit “Not provided/Unavailable” labels without breaking UI.

**Checkpoint**: Foundation ready; user stories can proceed.

---

## Phase 3: User Story 1 - Navigate Daily Plan (Priority: P1) 🎯 MVP

**Goal**: Traveler can switch day tabs and see only the selected day’s content with default and empty states.

**Independent Test**: Load an itinerary with multiple days (including one empty day), switch tabs, and verify only selected-day checklist/map content is visible.

### Tests for User Story 1 (write first, verify failing) ⚠️

- [x] T011 [P] [US1] Add integration test for active tab, selected-day-only rendering, and default day selection in `tests/integration/day-navigation.test.js`; Test: run `npm run test:integration -- tests/integration/day-navigation.test.js`; Acceptance: tests initially fail against unimplemented day-tab behavior.
- [x] T012 [P] [US1] Add integration test for empty-day state and stale-content prevention in `tests/integration/day-navigation.test.js`; Test: run `npm run test:integration -- tests/integration/day-navigation.test.js`; Acceptance: tests initially fail and explicitly assert empty-state message visibility.

### Implementation for User Story 1

- [x] T013 [US1] Implement day-tab rendering and ARIA tab semantics in `index.html`; Test: run `npm run test:integration -- tests/integration/day-navigation.test.js`; Acceptance: exactly one tab has active visual + `aria-selected="true"` state.
- [x] T014 [US1] Implement day-switch controller to filter checklist + map panel by `selectedDayId` in `index.html`; Test: run `npm run test:integration -- tests/integration/day-navigation.test.js`; Acceptance: switching tabs never shows activities from non-selected days.
- [x] T015 [US1] Implement default selected-day initialization and empty-day UI copy in `index.html`; Test: run `npm run test:integration -- tests/integration/day-navigation.test.js`; Acceptance: first valid day auto-selects on load and empty day shows explicit empty-state text.
- [x] T016 [US1] Add US1 manual acceptance script in `tests/manual/us1-day-navigation.md`; Test: execute checklist manually on mobile viewport; Acceptance: all three US1 acceptance scenarios in `spec.md` are checked complete.

**Checkpoint**: US1 is independently functional and testable.

---

## Phase 4: User Story 2 - View Route and Open Locations (Priority: P2)

**Goal**: Traveler sees per-day ordered route and can open mapped activities in Google Maps while handling missing map data gracefully.

**Independent Test**: Select a day with 3 activities (one missing coordinates) and verify route order, maps links, and unavailable-data labeling.

### Tests for User Story 2 (write first, verify failing) ⚠️

- [x] T017 [P] [US2] Add integration test for route point ordering and segment generation in `tests/integration/map-route-rendering.test.js`; Test: run `npm run test:integration -- tests/integration/map-route-rendering.test.js`; Acceptance: tests fail before route renderer implementation.
- [x] T018 [P] [US2] Add integration test for missing map data degradation behavior in `tests/integration/map-route-rendering.test.js`; Test: run `npm run test:integration -- tests/integration/map-route-rendering.test.js`; Acceptance: tests fail and assert valid points still render with unavailable labels.
- [x] T019 [P] [US2] Add Playwright mobile test for opening activity map links in `tests/e2e/mobile-trip-flow.spec.js`; Test: run `npm run test:e2e -- tests/e2e/mobile-trip-flow.spec.js`; Acceptance: test fails first and expects outbound Google Maps URL per activity.

### Implementation for User Story 2

- [x] T020 [US2] Implement per-day route renderer (ordered markers + connecting segments) in `index.html`; Test: run `npm run test:integration -- tests/integration/map-route-rendering.test.js`; Acceptance: route shows in itinerary order for days with 2+ map-valid activities.
- [x] T021 [US2] Implement map-point and detail-level Google Maps link actions in `index.html`; Test: run `npm run test:e2e -- tests/e2e/mobile-trip-flow.spec.js`; Acceptance: selecting map action opens correct `mapsUrl` in new tab/window intent.
- [x] T022 [US2] Implement map data fallback badges/messages for missing coordinates or URL in `index.html`; Test: run `npm run test:integration -- tests/integration/map-route-rendering.test.js`; Acceptance: missing-map activities remain checklist-visible and clearly marked unavailable in map context.
- [x] T023 [US2] Add US2 manual resilience script (offline/slow link behavior) in `tests/manual/us2-map-resilience.md`; Test: run manual checks with network disabled; Acceptance: checklist/details remain usable and map area degrades without blocking navigation.

**Checkpoint**: US2 is independently functional and testable.

---

## Phase 5: User Story 3 - Track and Inspect Activities (Priority: P3)

**Goal**: Traveler can mark done/skipped with mutual exclusivity, auto-collapse on status change, and inspect complete activity details.

**Independent Test**: Toggle multiple activities between statuses, expand/collapse details, and verify required detail fields + missing-value labels.

### Tests for User Story 3 (write first, verify failing) ⚠️

- [x] T024 [P] [US3] Add unit tests for status transition rules and persistence across day switches in `tests/unit/checklist-state.test.js`; Test: run `npm run test:unit -- tests/unit/checklist-state.test.js`; Acceptance: tests fail before status reducer/controller implementation.
- [x] T025 [P] [US3] Add integration test for auto-collapse on done/skipped updates in `tests/integration/day-navigation.test.js`; Test: run `npm run test:integration -- tests/integration/day-navigation.test.js`; Acceptance: tests fail and assert expanded panel collapses immediately after status change.
- [x] T026 [P] [US3] Add integration test for full activity-detail field rendering + missing optional labels in `tests/integration/file-load-validation.test.js`; Test: run `npm run test:integration -- tests/integration/file-load-validation.test.js`; Acceptance: tests fail first and assert all FR-009 to FR-017 fields.

### Implementation for User Story 3

- [x] T027 [US3] Implement done/skipped mutually exclusive controls per activity in `index.html`; Test: run `npm run test:unit -- tests/unit/checklist-state.test.js`; Acceptance: an activity cannot be both done and skipped, and latest selection overwrites prior state.
- [x] T028 [US3] Implement auto-collapse behavior for expanded item on status change in `index.html`; Test: run `npm run test:integration -- tests/integration/day-navigation.test.js`; Acceptance: expanded details close automatically after done/skipped is applied.
- [x] T029 [US3] Implement full expandable details renderer (name, image, description, maps, price, tips, photo tips, ratings, review links, website) in `index.html`; Test: run `npm run test:integration -- tests/integration/file-load-validation.test.js`; Acceptance: all required detail categories display with descriptive placeholders for missing optional values.
- [x] T030 [US3] Preserve activity status state while switching days in `index.html`; Test: run `npm run test:unit -- tests/unit/checklist-state.test.js`; Acceptance: switching away and back to a day retains each activity’s selected status in-session.
- [x] T031 [US3] Add US3 manual detail/accessibility script in `tests/manual/us3-checklist-details.md`; Test: perform keyboard + touch checklist from manual script; Acceptance: US3 acceptance scenarios pass including reopen of collapsed activities.

**Checkpoint**: US3 is independently functional and testable.

---

## Phase 6: User Story 4 - Reuse with New Itinerary Data (Priority: P4)

**Goal**: Traveler can load reusable itinerary JSON files with robust validation and clear error feedback.

**Independent Test**: Load two valid files sequentially and one invalid file; verify full UI updates on valid load and preservation of prior valid content on invalid load.

### Tests for User Story 4 (write first, verify failing) ⚠️

- [x] T032 [P] [US4] Add unit tests for semantic validation rules (date order, unique dayNumber, unique activity order per day) in `tests/unit/itinerary-validator.test.js`; Test: run `npm run test:unit -- tests/unit/itinerary-validator.test.js`; Acceptance: tests fail before semantic rule implementation.
- [x] T033 [P] [US4] Add integration tests for valid file replacement and invalid-file rollback behavior in `tests/integration/file-load-validation.test.js`; Test: run `npm run test:integration -- tests/integration/file-load-validation.test.js`; Acceptance: tests fail and assert previous valid itinerary remains visible after invalid load.
- [x] T034 [P] [US4] Add E2E mobile flow for file upload and UI refresh in `tests/e2e/mobile-trip-flow.spec.js`; Test: run `npm run test:e2e -- tests/e2e/mobile-trip-flow.spec.js`; Acceptance: tests fail first and assert day tabs/map/checklist update from loaded file.

### Implementation for User Story 4

- [x] T035 [US4] Implement file input + JSON parsing lifecycle (`idle/loading/loaded/validation_error`) in `index.html`; Test: run `npm run test:integration -- tests/integration/file-load-validation.test.js`; Acceptance: load state transitions and user-readable validation messages are rendered.
- [x] T036 [US4] Implement schema + semantic validation pipeline using `contracts/itinerary-file.schema.json` rules and data-model invariants in `index.html`; Test: run `npm run test:unit -- tests/unit/itinerary-validator.test.js`; Acceptance: invalid/incomplete files are rejected with precise field-level feedback.
- [x] T037 [US4] Implement safe state replacement on valid load and rollback on invalid load in `index.html`; Test: run `npm run test:integration -- tests/integration/file-load-validation.test.js`; Acceptance: valid file fully updates UI and invalid file never overwrites previous valid content.
- [x] T038 [US4] Add US4 manual file-load script in `tests/manual/us4-file-loading.md`; Test: execute manual valid/invalid file scenarios; Acceptance: both US4 acceptance scenarios in `spec.md` pass exactly.

**Checkpoint**: US4 is independently functional and testable.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final quality, performance, and release-readiness across all stories.

- [x] T039 [P] Add consolidated manual acceptance checklist aligned to `quickstart.md` in `tests/manual/final-acceptance.md`; Test: execute checklist on 360px and 430px widths; Acceptance: all mandatory checklist items pass.
- [x] T040 [P] Add performance-focused integration assertions for day switching and route refresh in `tests/integration/map-route-rendering.test.js`; Test: run `npm run test:integration -- tests/integration/map-route-rendering.test.js`; Acceptance: day switch interactions complete within target threshold under test fixture load.
- [x] T041 Validate end-to-end quality gate command flow in `quickstart.md`; Test: run `npm run test:unit && npm run test:integration && npm run test:e2e`; Acceptance: all suites pass in sequence before release handoff.
- [x] T042 Confirm single-file portability and document delivery notes in `README.md`; Test: open copied standalone `index.html` from a separate folder; Acceptance: core itinerary navigation/checklist/details work with no required local runtime assets.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: starts immediately.
- **Foundational (Phase 2)**: depends on Setup; blocks all user stories.
- **User Stories (Phases 3-6)**: each depends on Foundational completion.
- **Polish (Phase 7)**: depends on all target user stories complete.

### User Story Dependencies

- **US1 (P1)**: starts after Foundational; no dependency on other user stories.
- **US2 (P2)**: starts after Foundational; uses shared day-selection primitives from foundation, remains independently testable.
- **US3 (P3)**: starts after Foundational; independent of US2 completion, integrates with shared day/activity rendering.
- **US4 (P4)**: starts after Foundational; can be built independently but validates all story surfaces after file load.

### Dependency Graph (Story Completion Order)

- Foundation → US1 → Polish
- Foundation → US2 → Polish
- Foundation → US3 → Polish
- Foundation → US4 → Polish
- Priority delivery path: US1 (MVP) → US2 → US3 → US4

### Within Each User Story

- Write tests first and confirm they fail.
- Implement feature logic until story tests pass.
- Execute story manual acceptance checklist.
- Do not advance to next task until task Test + Acceptance gate is satisfied.

---

## Parallel Execution Examples

### US1 Parallel Example

```bash
T011 and T012 in parallel, then T013-T016 sequentially.
```

### US2 Parallel Example

```bash
T017, T018, and T019 in parallel, then T020-T023 sequentially.
```

### US3 Parallel Example

```bash
T024, T025, and T026 in parallel, then T027-T031 sequentially.
```

### US4 Parallel Example

```bash
T032, T033, and T034 in parallel, then T035-T038 sequentially.
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1 and Phase 2.
2. Complete US1 (Phase 3) including tests and manual acceptance.
3. Demo/release MVP once US1 gates pass.

### Incremental Delivery

1. Foundation complete.
2. Deliver US1, then US2, then US3, then US4 in priority order.
3. Re-run full quality gate after each story increment.

### Parallel Team Strategy

1. Team completes Setup + Foundational together.
2. After foundation: split owners by user story and use `[P]` tasks for concurrency.
3. Merge only after each story’s independent tests and acceptance checklist pass.

---

## Notes

- All tasks follow strict checklist format: `- [ ] T### [P?] [US?] Description with file path`.
- Story tasks include `[US#]`; Setup/Foundational/Polish tasks intentionally do not.
- `[P]` marks no-conflict parallel work only.
- Every task includes explicit test and acceptance gates that must pass before proceeding.
