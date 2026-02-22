# Feature Specification: Interactive Trip Itinerary

**Feature Branch**: `[001-interactive-itinerary]`  
**Created**: 2026-02-22  
**Status**: Draft  
**Input**: User description: "I want to create an interactive itinerary that I can use on a trip. It should include day tabs, per-day map routes between activities, activity checklists, expandable activity details, and support loading itinerary data from a reusable file."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Navigate Daily Plan (Priority: P1)

As a traveler, I can switch between days of my trip and immediately see that day’s activities so I can stay organized throughout the trip.

**Why this priority**: Day-by-day navigation is the core structure of the itinerary; without it, the rest of the feature is hard to use.

**Independent Test**: Can be fully tested by loading a multi-day itinerary and confirming each day tab displays only that day’s checklist and map content.

**Acceptance Scenarios**:

1. **Given** an itinerary with multiple days, **When** the traveler selects a day tab, **Then** the selected tab is visibly active and the page shows only that day’s content.
2. **Given** an itinerary with at least one day, **When** the traveler opens the itinerary, **Then** a default day is selected and its content is immediately visible.
3. **Given** an itinerary day with no activities, **When** the traveler selects that day, **Then** the system shows an empty-state message and no stale activities from other days.

---

### User Story 2 - View Route and Open Locations (Priority: P2)

As a traveler, I can view each day’s route on a map and open any activity location in Google Maps for turn-by-turn navigation.

**Why this priority**: Route clarity and map handoff are critical during travel, especially when moving between activities.

**Independent Test**: Can be fully tested by selecting a day with multiple activities, verifying route order on the map, and opening each point in Google Maps.

**Acceptance Scenarios**:

1. **Given** a day with two or more activities that include map locations, **When** the traveler opens that day, **Then** the map displays all activity points and a route in itinerary order.
2. **Given** a map point for an activity, **When** the traveler selects it, **Then** the system opens the corresponding Google Maps location.
3. **Given** an activity without map coordinates or a valid maps URL, **When** the day is shown, **Then** the system still displays remaining valid points and clearly marks the missing map data.

---

### User Story 3 - Track and Inspect Activities (Priority: P3)

As a traveler, I can mark activities as done or skipped and expand each activity to see full planning details so I can make informed decisions during the trip.

**Why this priority**: Checklist and detailed activity context improve execution quality once navigation and maps are already available.

**Independent Test**: Can be fully tested by toggling checklist items and expanding activity details to confirm all required information fields are present.

**Acceptance Scenarios**:

1. **Given** a day with activities, **When** the traveler marks an activity as done or skipped, **Then** the selected status is visually updated for that activity.
2. **Given** an expanded activity, **When** the traveler marks it as done or skipped, **Then** that activity auto-collapses after the status change is applied.
3. **Given** an activity in the checklist, **When** the traveler expands it, **Then** details show name, image, description, maps link, price, activity tips, photo-spot tips for taking strong Instagram-style pictures, ratings/review summary with review links, and website link.
4. **Given** an activity missing one or more optional details (for example, no price or no website), **When** the traveler expands it, **Then** available fields are shown and missing fields are clearly indicated.

---

### User Story 4 - Reuse with New Itinerary Data (Priority: P4)

As a traveler, I can load a structured itinerary data file so the same itinerary experience can be reused for any trip without manually rebuilding content.

**Why this priority**: Reusability is essential for long-term value but depends on the core day/map/checklist experiences already existing.

**Independent Test**: Can be fully tested by loading two different itinerary data files and confirming the interface updates to reflect each trip.

**Acceptance Scenarios**:

1. **Given** a valid itinerary data file, **When** the traveler loads it, **Then** day tabs, maps, and activity details render from file content.
2. **Given** an invalid or incomplete itinerary data file, **When** the traveler attempts to load it, **Then** the system shows clear validation feedback and does not display misleading partial content.

---

### Edge Cases

- A day contains only one activity, so no route segment can be drawn between multiple stops.
- Activities are provided in duplicate order numbers or with inconsistent ordering information.
- Mobile connectivity is unavailable or intermittent during use.
- External providers (Google Maps, review sites, activity websites, image hosts) are slow or unavailable.
- The itinerary file includes unsupported field names, missing required fields, or malformed links.
- The itinerary has many activities in one day, requiring clear scrolling and map point distinction.
- A traveler changes an activity from done to skipped (or skipped to done) and expects the latest status to replace the previous one.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST present trip days as navigable tabs and allow switching between days.
- **FR-002**: System MUST show only the selected day’s checklist and map context at any time.
- **FR-003**: System MUST provide a map for each day that shows activity points for that day.
- **FR-004**: System MUST visualize the travel route between activities for days with two or more mapped activities.
- **FR-005**: Users MUST be able to open each mapped activity location in Google Maps.
- **FR-006**: System MUST provide a checklist of activities for each day.
- **FR-007**: Users MUST be able to mark each activity as either done or skipped.
- **FR-008**: Each checklist activity MUST support expand/collapse behavior for details.
- **FR-008a**: When a traveler marks an expanded activity as done or skipped, the activity details MUST auto-collapse.
- **FR-009**: Expanded activity details MUST include activity name.
- **FR-010**: Expanded activity details MUST include an activity image.
- **FR-011**: Expanded activity details MUST include an activity description.
- **FR-012**: Expanded activity details MUST include a Google Maps link.
- **FR-013**: Expanded activity details MUST include price information.
- **FR-014**: Expanded activity details MUST include tips for things to do.
- **FR-014a**: Expanded activity details MUST include photo-spot guidance for each activity, including practical suggestions for taking visually appealing social-media photos.
- **FR-015**: Expanded activity details MUST include a summary of ratings and reviews.
- **FR-016**: Expanded activity details MUST include links to one or more review websites.
- **FR-017**: Expanded activity details MUST include a link to the activity’s website.
- **FR-018**: System MUST allow loading itinerary content from a reusable structured data file.
- **FR-019**: System MUST validate loaded itinerary data and provide user-readable error messages for invalid files.
- **FR-020**: System MUST preserve each activity’s done/skipped status when switching between day tabs during the same itinerary session.

### Constitution Alignment Requirements *(mandatory)*

- **CA-001**: Feature MUST be usable in a mobile-first layout and define the primary phone
  viewport assumptions.
- **CA-002**: Feature MUST preserve self-contained/static delivery expectations and document any
  dependency on third-party online services.
- **CA-003**: Feature MUST state how it contributes to itinerary completeness (maps, lists, links,
  review summaries, ratings, checklists) or explicitly record intentional exclusions.
- **CA-004**: Feature MUST define accessibility expectations for key interactions.

- **CA-005**: Primary viewport assumption MUST target phone widths from 360px to 430px while remaining usable at larger widths.
- **CA-006**: Third-party service dependencies MUST be limited to user-opened external links and map/review data references; when unavailable, core itinerary navigation and checklist behavior MUST remain usable.
- **CA-007**: Feature completeness MUST include day navigation, route-aware maps, per-day checklists, expandable details, map/review/website links, and reusable file-driven itinerary loading.
- **CA-008**: Accessibility expectations MUST include keyboard support for tab navigation and expand/collapse controls, visible focus states, meaningful alternative text for images, and descriptive link labels.

### Key Entities *(include if feature involves data)*

- **Itinerary**: A complete trip plan containing trip title, optional date range, and an ordered collection of trip days.
- **Trip Day**: A single day within the itinerary containing day label/order and a list of activities.
- **Activity**: A planned stop with required detail fields (name, image reference, description, maps link, price, tips, photo-spot tips for visually appealing photos, ratings/review summary, review links, website link), map/location information, and a checklist status of done or skipped.
- **Route Segment**: The ordered connection between adjacent activities within a day, used to represent travel flow.
- **Review Reference**: A named external review source with a destination link, associated with one activity.
- **Itinerary Data File**: A reusable structured input artifact that defines itinerary, day, and activity content for rendering.

### Assumptions

- The itinerary is used by a single traveler profile at a time.
- Activity ordering is provided in the input data and represents the intended visit sequence.
- When third-party links are unavailable, the feature still provides readable local itinerary details.
- The reusable itinerary file is prepared in a pre-agreed structured format documented with required fields.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% of users can switch to a specific day and find that day’s activities within 10 seconds.
- **SC-002**: 95% of users can open at least one activity from the map in Google Maps within 15 seconds.
- **SC-003**: 90% of users can mark activities as done or skipped, with expanded activities auto-collapsing after status selection, and can still reopen any activity to view all required detail categories on first attempt.
- **SC-004**: 90% of valid itinerary files load successfully and display complete day/map/checklist content without manual correction.
- **SC-005**: 100% of invalid itinerary files produce clear feedback that identifies missing or malformed required fields.
