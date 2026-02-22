# Phase 0 Research — Interactive Trip Itinerary

## Decision 1: Single-file frontend architecture (no backend)

- Decision: Implement as one standalone HTML file containing inline CSS and JavaScript.
- Rationale: Satisfies strict portability requirement that the app is shareable by sending a single file.
- Alternatives considered: Multi-file static app (rejected because it requires packaging folders); SPA framework + backend API (rejected due to portability and complexity risk).

## Decision 2: Itinerary file contract format

- Decision: Use a versioned JSON itinerary format validated on load against a strict schema plus runtime semantic checks.
- Rationale: JSON is easy to author/reuse and supports deterministic validation errors for malformed or incomplete inputs.
- Alternatives considered: YAML (rejected due to higher parser ambiguity and user formatting errors); CSV (rejected because nested day/activity detail is awkward).

## Decision 3: Map and route rendering strategy

- Decision: Use browser-native SVG/canvas rendering for per-day route visualization from ordered activity coordinates.
- Rationale: Preserves the single-file runtime constraint with no required external libraries or tile assets.
- Alternatives considered: Leaflet/Google Maps SDK (rejected because they introduce external assets/services for core rendering).

## Decision 4: Handling missing map data and third-party outages

- Decision: Render available activity markers only, flag activities missing coordinates/maps URL, and keep checklist/details fully usable even if tiles/links fail.
- Rationale: Meets FR/edge-case behavior and constitution requirement that core itinerary interactions remain usable when third-party services degrade.
- Alternatives considered: Blocking day map when any marker invalid (rejected due to poor resilience); hard-fail on missing optional map fields (rejected due to brittle UX).

## Decision 5: Checklist state scope and behavior

- Decision: Track checklist state per activity in-memory for current itinerary session; enforce mutually exclusive statuses (`done` or `skipped`) and auto-collapse expanded activity on status change.
- Rationale: Exactly matches FR-007, FR-008a, FR-020 while keeping implementation simple and predictable.
- Alternatives considered: Persist in localStorage (deferred; not required by spec); multi-status history (rejected as unnecessary complexity).

## Decision 6: Accessibility model for tabs and detail expansion

- Decision: Use WAI-ARIA tab pattern for day navigation and button-driven disclosure pattern for activity details with full keyboard support.
- Rationale: Delivers required accessibility behavior and mobile/desktop parity with minimal custom logic.
- Alternatives considered: Click-only custom div controls (rejected due to keyboard/accessibility gaps).

## Decision 7: Test strategy by implementation stage and story

- Decision: Enforce story-by-story quality gates: unit tests for validation/state logic, integration tests for UI behavior, Playwright mobile E2E for full traveler flows.
- Rationale: Ensures each story is independently testable and complete before progressing, matching spec priorities and user requirement for stage testing.
- Alternatives considered: End-only testing (rejected due to delayed defect detection); manual-only validation (rejected due to low repeatability).

## Clarification Resolution Summary

All prior planning ambiguities are resolved:

- File format: versioned JSON with strict schema.
- Map rendering: native in-file route visualization + coordinate-driven polyline/segments.
- Validation approach: schema + semantic checks with user-readable errors.
- Testing stack: Vitest + Playwright + manual acceptance checklist.
- Accessibility interaction model: ARIA tabs + keyboard disclosure controls.
