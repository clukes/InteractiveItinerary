# Data Model — Interactive Trip Itinerary

## Entity: Itinerary

- Fields:
    - `schemaVersion` (string, required, pattern `^1\.0$`)
    - `tripId` (string, required, non-empty)
    - `title` (string, required, non-empty)
    - `dateRange` (object, optional)
        - `start` (ISO date string)
        - `end` (ISO date string, must be >= `start`)
    - `days` (array of `TripDay`, required, min length 1)
- Relationships:
    - One `Itinerary` has many `TripDay`.
- Validation Rules:
    - `days` must be ordered and unique by `dayNumber`.

## Entity: TripDay

- Fields:
    - `dayId` (string, required)
    - `dayNumber` (integer, required, >= 1)
    - `label` (string, required, e.g. "Day 1")
    - `date` (ISO date string, optional)
    - `activities` (array of `Activity`, required; may be empty)
- Relationships:
    - One `TripDay` has many `Activity`.
- Validation Rules:
    - `activities` ordered by `order` with no duplicates.
    - Empty `activities` is valid and triggers day empty state.

## Entity: Activity

- Fields:
    - `activityId` (string, required)
    - `order` (integer, required, >= 1)
    - `name` (string, required)
    - `description` (string, required)
    - `image` (object, required)
        - `url` (URL string, required)
        - `alt` (string, required)
    - `location` (object, required)
        - `lat` (number, optional if `mapsUrl` exists)
        - `lng` (number, optional if `mapsUrl` exists)
        - `mapsUrl` (URL string, required)
    - `price` (string or null, required key; null means not provided)
    - `tips` (array of strings, required, min length 1)
    - `photoSpotTips` (array of strings, required, min length 1)
    - `ratingSummary` (string or null, required key)
    - `reviewLinks` (array of `ReviewReference`, required key, may be empty)
    - `websiteUrl` (URL string or null, required key)
    - `status` (enum: `pending|done|skipped`, runtime state; defaults to `pending`)
- Relationships:
    - One `Activity` has zero or more `ReviewReference`.
- Validation Rules:
    - If `lat/lng` missing, activity is marked as "map data unavailable" but remains checklist-visible.
    - `reviewLinks` entries must have unique `sourceName` per activity.

## Entity: RouteSegment

- Fields:
    - `fromActivityId` (string, required)
    - `toActivityId` (string, required)
    - `dayId` (string, required)
    - `sequence` (integer, required)
- Derived Rules:
    - Generated for each adjacent pair of map-valid activities in a day.
    - No segments for days with fewer than 2 map-valid activities.

## Entity: ReviewReference

- Fields:
    - `sourceName` (string, required)
    - `url` (URL string, required)
- Validation Rules:
    - URLs must be absolute (`https://`).

## State Transitions

### Day Selection

- `selectedDayId` transitions from one valid day to another via tab interaction.
- Invariant: only one selected day at a time.

### Activity Status

- Allowed transitions:
    - `pending -> done`
    - `pending -> skipped`
    - `done -> skipped`
    - `skipped -> done`
- Rules:
    - Status is mutually exclusive (`done` and `skipped` cannot both be active).
    - If activity details are expanded and status changes, expanded state transitions to collapsed.

### File Load Lifecycle

- `idle -> loading -> loaded`
- `idle -> loading -> validation_error`
- On `validation_error`, previous valid itinerary view remains intact.
