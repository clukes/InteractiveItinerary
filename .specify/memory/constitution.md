<!--
Sync Impact Report
- Version change: 0.0.0 → 1.0.0
- Modified principles:
	- N/A (initial template) → I. Self-Contained Portable Delivery
	- N/A (initial template) → II. Mobile-First Experience
	- N/A (initial template) → III. Map-First, Clean, Familiar UI
	- N/A (initial template) → IV. Itinerary Feature Completeness
	- N/A (initial template) → V. Simplicity, Performance, and Reliability
- Added sections:
	- Product & Technical Constraints
	- Workflow & Quality Gates
- Removed sections:
	- None
- Templates requiring updates:
	- ✅ updated: .specify/templates/plan-template.md
	- ✅ updated: .specify/templates/spec-template.md
	- ✅ updated: .specify/templates/tasks-template.md
	- ⚠ pending: .specify/templates/commands/*.md (directory not present)
- Deferred follow-up TODOs:
	- None
-->

# Interactive Itinerary Constitution

## Core Principles

### I. Self-Contained Portable Delivery

All deliverables MUST run as a static HTML web app that can be shared as files and opened
directly on a phone browser without requiring account creation, backend services, or custom
deployment steps. External services (for example, map tiles or third-party links) MAY be used,
but core itinerary browsing and interaction MUST remain usable when these services are limited
or unavailable.
Rationale: The primary product goal is frictionless sharing and immediate use on mobile.

### II. Mobile-First Experience

Every feature MUST be designed for mobile first, with touch-first interactions, responsive
layouts, and readable defaults on common phone viewports before tablet/desktop enhancements are
added. Critical tasks (navigate itinerary, open map context, check items, view ratings/reviews)
MUST be completable with one hand and without precision pointer input.
Rationale: The application is intended to be consumed primarily on phones.

### III. Map-First, Clean, Familiar UI

The interface MUST prioritize geographic context and wayfinding with a clean visual hierarchy.
Design language SHOULD take inspiration from mainstream map products (for example, Google Maps)
for familiarity, while avoiding direct copying of proprietary assets. UI decisions MUST favor
clarity, low cognitive load, and obvious affordances over decorative complexity.
Rationale: Users need fast orientation and confidence while moving between places.

### IV. Itinerary Feature Completeness

Each release MUST support the full itinerary interaction model relevant to its scope: map
view(s), list view(s), actionable links, review summaries, ratings, and checklist progress.
If a feature is intentionally omitted, the specification MUST document the omission and user
impact explicitly.
Rationale: The product promise depends on combining planning context and execution tools.

### V. Simplicity, Performance, and Reliability

Implementation MUST remain as simple as practical: minimal dependencies, predictable data flow,
and no architectural layers without clear user value. On representative mobile hardware,
primary screens MUST become interactive quickly and remain responsive during common interactions.
Features that risk performance regressions MUST include mitigation and validation notes in plans.
Rationale: A lightweight architecture improves portability, maintainability, and UX quality.

## Product & Technical Constraints

- Stack defaults to static web technologies (HTML, CSS, JavaScript) with assets that can be
  distributed together.
- Features MUST degrade gracefully when network connectivity is poor.
- Accessibility requirements are mandatory: semantic structure, keyboard fallback, sufficient
  contrast, and assistive-technology-compatible labels for key interactions.
- Any new third-party dependency MUST be justified in the plan with bundle-size and portability
  impact.

## Workflow & Quality Gates

- Specifications MUST define mobile-first scenarios as Priority 1 journeys.
- Plans MUST pass Constitution Check gates for portability, mobile UX, map/list parity, and
  performance assumptions before implementation starts.
- Tasks MUST include explicit validation for responsiveness, usability, and key interaction
  reliability on phone-sized viewports.
- Reviews MUST reject changes that violate a core principle unless an approved amendment is
  merged first.

## Governance

This constitution is the highest-priority project guidance for product and engineering decisions.
Amendments require: (1) a proposed diff, (2) rationale, (3) impacted template/process updates,
and (4) approval by project maintainers before merge.

Versioning policy for this constitution follows semantic versioning:

- MAJOR: incompatible principle redefinitions or principle removals.
- MINOR: new principle/section or materially expanded governance guidance.
- PATCH: clarifications, wording improvements, and non-semantic edits.

Compliance review is required at plan approval and pull-request review. Non-compliant work MUST
be corrected before merge or tracked as an approved, time-bound exception.

**Version**: 1.0.0 | **Ratified**: 2026-02-22 | **Last Amended**: 2026-02-22
