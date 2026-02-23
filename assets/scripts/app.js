/* ====================================================================
     Interactive Trip Itinerary — Inline Application Script
     ==================================================================== */
(function () {
    "use strict";

    const validateItinerary =
        window.__itineraryModules?.validation?.validateItinerary;
    if (typeof validateItinerary !== "function") {
        throw new Error(
            "Validation module failed to load before app bootstrap.",
        );
    }
    const renderMapSection =
        window.__itineraryModules?.mapRendering?.renderMapSection;
    if (typeof renderMapSection !== "function") {
        throw new Error(
            "Map rendering module failed to load before app bootstrap.",
        );
    }

    const appConfig = {
        workerAuthEndpoint:
            "https://itinerary-worker.digiconner.workers.dev/auth-itinerary",
        localFallbackDataPath: "assets/data/default-itinerary.json",
        ...(window.__itineraryConfig || {}),
    };

    // ── App State ──
    const state = {
        itinerary: null,
        selectedDayId: null,
        activityStatuses: {}, // { activityId: 'pending'|'done'|'skipped' }
        expandedActivityId: null,
        fileLoadState: "idle", // idle|loading|loaded|validation_error
        mapFilterKeyHidden: window.innerWidth <= 640,
    };

    // Expose state for testing
    window.__itineraryState = state;

    // Expose validator for testing
    window.__validateItinerary = validateItinerary;

    // ── State Management ──
    function getActivityStatus(activityId) {
        return state.activityStatuses[activityId] || "pending";
    }

    function setActivityStatus(activityId, newStatus) {
        if (!["pending", "done", "skipped"].includes(newStatus)) return;
        state.activityStatuses[activityId] = newStatus;
        saveStatusesToStorage();
        // Auto-collapse if expanded
        if (state.expandedActivityId === activityId) {
            state.expandedActivityId = null;
        }
        renderDayContent();
    }

    function getStorageKey() {
        const tripId = state.itinerary?.tripId;
        return tripId ? `itinerary_statuses_${tripId}` : null;
    }

    function saveStatusesToStorage() {
        try {
            const key = getStorageKey();
            if (!key) return;
            const toSave = {};
            for (const [id, status] of Object.entries(state.activityStatuses)) {
                if (status !== "pending") toSave[id] = status;
            }
            localStorage.setItem(key, JSON.stringify(toSave));
        } catch (_) {
            /* storage unavailable */
        }
    }

    function loadStatusesFromStorage() {
        try {
            const key = getStorageKey();
            if (!key) return null;
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch (_) {
            return null;
        }
    }

    function toggleExpand(activityId) {
        state.expandedActivityId =
            state.expandedActivityId === activityId ? null : activityId;
        renderDayContent();
    }

    function toggleMapFilterKey() {
        state.mapFilterKeyHidden = !state.mapFilterKeyHidden;
        renderDayContent();
    }

    function selectDay(dayId) {
        if (state.selectedDayId === dayId) return;
        state.selectedDayId = dayId;
        renderDayTabs();
        renderDayContent();
    }

    // Expose for testing
    window.__getActivityStatus = getActivityStatus;
    window.__setActivityStatus = setActivityStatus;
    window.__toggleExpand = toggleExpand;
    window.__selectDay = selectDay;

    // ── Rendering ──
    function getSelectedDay() {
        if (!state.itinerary) return null;
        return (
            state.itinerary.days.find((d) => d.dayId === state.selectedDayId) ||
            null
        );
    }

    function renderApp() {
        renderHeader();
        renderDayTabs();
        renderDayContent();
    }

    function isLocalDevelopmentHost() {
        const host = window.location.hostname;
        return host === "localhost" || host === "127.0.0.1" || host === "::1";
    }

    function getUnlockElements() {
        return {
            panel: document.getElementById("unlock-panel"),
            input: document.getElementById("unlock-password"),
            toggle: document.getElementById("toggle-unlock-password"),
            button: document.getElementById("unlock-button"),
            help: document.getElementById("unlock-help"),
        };
    }

    function setUnlockPasswordVisibility(isVisible) {
        const unlockElements = getUnlockElements();
        if (!unlockElements.input || !unlockElements.toggle) return;

        unlockElements.input.type = isVisible ? "text" : "password";
        unlockElements.toggle.textContent = isVisible ? "Hide" : "Show";
        unlockElements.toggle.setAttribute(
            "aria-label",
            isVisible ? "Hide password" : "Show password",
        );
        unlockElements.toggle.setAttribute(
            "aria-pressed",
            isVisible ? "true" : "false",
        );
    }

    function setUnlockPanelVisible(isVisible) {
        const unlockElements = getUnlockElements();
        if (!unlockElements.panel) return;
        unlockElements.panel.style.display = isVisible ? "block" : "none";
    }

    function setUnlockControlsDisabled(isDisabled) {
        const unlockElements = getUnlockElements();
        if (unlockElements.input) {
            unlockElements.input.disabled = isDisabled;
        }
        if (unlockElements.toggle) {
            unlockElements.toggle.disabled = isDisabled;
        }
        if (unlockElements.button) {
            unlockElements.button.disabled = isDisabled;
        }
    }

    async function showDemoItineraryLockedState() {
        await bootstrapDefaultItinerary();
        updateFileStatus(
            "Showing demo itinerary. Enter password to unlock your itinerary.",
            "",
        );
    }

    async function unlockItineraryWithPassword(password) {
        const endpoint = appConfig.workerAuthEndpoint;

        if (
            typeof endpoint !== "string" ||
            endpoint.includes("REPLACE_WITH_YOUR_WORKER_SUBDOMAIN")
        ) {
            throw new Error("Worker endpoint is not configured yet.");
        }

        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ password }),
        });

        let responseJson = null;
        try {
            responseJson = await response.json();
        } catch (_) {
            responseJson = null;
        }

        if (response.status === 401) {
            throw new Error("Incorrect password.");
        }

        if (!response.ok) {
            const serverError =
                responseJson && typeof responseJson.error === "string"
                    ? responseJson.error
                    : "";
            throw new Error(
                serverError || `Unable to load itinerary (status ${response.status}).`,
            );
        }

        const data = responseJson;
        const loaded = loadItinerary(data, {
            restoreFromStorage: true,
        });

        if (!loaded) {
            throw new Error("Returned itinerary failed validation.");
        }

        setUnlockPanelVisible(false);
    }

    function bindUnlockEvents() {
        const unlockElements = getUnlockElements();
        if (!unlockElements.button || !unlockElements.input) return;

        setUnlockPasswordVisibility(false);

        if (unlockElements.toggle) {
            unlockElements.toggle.addEventListener("click", () => {
                setUnlockPasswordVisibility(
                    unlockElements.input.type === "password",
                );
            });
        }

        const submitUnlock = async () => {
            const password = unlockElements.input.value;
            if (!password) {
                await showDemoItineraryLockedState();
                return;
            }

            setUnlockControlsDisabled(true);
            updateFileStatus("Unlocking itinerary...", "");
            try {
                await unlockItineraryWithPassword(password);
                updateFileStatus("Itinerary unlocked successfully.", "success");
                unlockElements.input.value = "";
                setUnlockPasswordVisibility(false);
            } catch (err) {
                updateFileStatus(
                    err && err.message
                        ? err.message
                        : "Unable to unlock itinerary.",
                    "error",
                );
            } finally {
                setUnlockControlsDisabled(false);
            }
        };

        unlockElements.button.addEventListener("click", submitUnlock);
        unlockElements.input.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                submitUnlock();
            }
        });
    }

    function renderHeader() {
        const titleEl = document.getElementById("app-title");
        const datesEl = document.getElementById("app-dates");
        if (!state.itinerary) {
            titleEl.textContent = "Interactive Trip Itinerary";
            datesEl.textContent = "";
            return;
        }
        titleEl.textContent = state.itinerary.title;
        if (state.itinerary.dateRange) {
            datesEl.textContent = `${state.itinerary.dateRange.start} — ${state.itinerary.dateRange.end}`;
        } else {
            datesEl.textContent = "";
        }
    }

    function renderDayTabs() {
        const container = document.getElementById("day-tabs");
        container.innerHTML = "";
        if (!state.itinerary) return;

        state.itinerary.days.forEach((day) => {
            const tab = document.createElement("button");
            tab.className = "day-tab";
            tab.setAttribute("role", "tab");
            tab.setAttribute(
                "aria-selected",
                day.dayId === state.selectedDayId ? "true" : "false",
            );
            tab.setAttribute("aria-controls", "day-content");
            tab.setAttribute("data-day-id", day.dayId);
            tab.id = `tab-${day.dayId}`;
            tab.textContent = day.label;
            tab.addEventListener("click", () => selectDay(day.dayId));
            tab.addEventListener("keydown", (e) =>
                handleTabKeydown(e, day.dayId),
            );
            container.appendChild(tab);
        });
    }

    function handleTabKeydown(e, currentDayId) {
        if (!state.itinerary) return;
        const days = state.itinerary.days;
        const idx = days.findIndex((d) => d.dayId === currentDayId);
        let newIdx = -1;

        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
            e.preventDefault();
            newIdx = (idx + 1) % days.length;
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
            e.preventDefault();
            newIdx = (idx - 1 + days.length) % days.length;
        } else if (e.key === "Home") {
            e.preventDefault();
            newIdx = 0;
        } else if (e.key === "End") {
            e.preventDefault();
            newIdx = days.length - 1;
        }

        if (newIdx >= 0) {
            selectDay(days[newIdx].dayId);
            const tabEl = document.getElementById(`tab-${days[newIdx].dayId}`);
            if (tabEl) tabEl.focus();
        }
    }

    function renderDayContent() {
        const container = document.getElementById("day-content");
        const day = getSelectedDay();

        if (!state.itinerary) {
            container.innerHTML =
                '<div class="empty-state"><span class="material-symbols-outlined" style="font-size: 3rem; color: #dadce0; margin-bottom: 1rem; display: block;">flight_takeoff</span><p>Load an itinerary file to get started.</p></div>';
            return;
        }

        if (!day) {
            container.innerHTML =
                '<div class="empty-state"><span class="material-symbols-outlined" style="font-size: 3rem; color: #dadce0; margin-bottom: 1rem; display: block;">calendar_today</span><p>Select a day to view activities.</p></div>';
            return;
        }

        if (!day.activities || day.activities.length === 0) {
            container.innerHTML = `
          <div class="day-panel" role="tabpanel" aria-labelledby="tab-${day.dayId}">
            <div class="empty-state">
              <span class="material-symbols-outlined" style="font-size: 3rem; color: #dadce0; margin-bottom: 1rem; display: block;">beach_access</span>
              <p>No activities planned for ${day.label}.</p>
            </div>
          </div>`;
            return;
        }

        const sortedActivities = [...day.activities].sort(
            (a, b) => a.order - b.order,
        );
        const mapValidActivities = sortedActivities.filter(
            (a) =>
                a.location &&
                typeof a.location.lat === "number" &&
                typeof a.location.lng === "number",
        );

        let html = `<div class="day-panel" role="tabpanel" aria-labelledby="tab-${day.dayId}">`;

        // Map section
        html += renderMapSection(
            sortedActivities,
            mapValidActivities,
            day.hotel,
            {
                mapFilterKeyHidden: state.mapFilterKeyHidden,
                escapeHtml,
            },
        );

        // Checklist section
        html += '<div class="checklist-section"><h2>Activities</h2>';
        sortedActivities.forEach((act) => {
            html += renderActivityCard(act);
        });
        html += "</div></div>";

        container.innerHTML = html;

        // Bind event listeners
        bindActivityEvents();
    }

    function renderActivityCard(act) {
        const status = getActivityStatus(act.activityId);
        const isExpanded = state.expandedActivityId === act.activityId;
        const hasMapData =
            act.location &&
            typeof act.location.lat === "number" &&
            typeof act.location.lng === "number";

        let html = `<div class="activity-card" id="card-${act.activityId}" data-activity-id="${act.activityId}" data-status="${status}" data-expanded="${isExpanded}">`;

        // Header (expand/collapse trigger)
        html += `<button class="activity-header" data-action="toggle" data-activity-id="${act.activityId}" aria-expanded="${isExpanded}" aria-controls="details-${act.activityId}">`;
        html += `<span class="activity-order">${act.order}</span>`;
        html += `<span class="activity-name">${escapeHtml(act.name)}</span>`;
        if (act.time)
            html += `<span class="activity-time">${escapeHtml(act.time)}</span>`;
        if (!hasMapData)
            html += `<span class="map-badge"><span class="material-symbols-outlined" style="font-size: 1rem;">location_off</span> No map</span>`;
        html += `<span class="material-symbols-outlined activity-expand-icon" aria-hidden="true">expand_more</span>`;
        html += `</button>`;

        // Status controls
        html += `<div class="activity-status">`;
        html += `<button class="status-btn btn-done" data-action="status" data-activity-id="${act.activityId}" data-status="done" data-active="${status === "done"}" aria-pressed="${status === "done"}" aria-label="Mark ${escapeHtml(act.name)} as done"><span class="material-symbols-outlined" style="font-size: 1rem; vertical-align: middle; margin-right: 4px;">check_circle</span>Done</button>`;
        html += `<button class="status-btn btn-skipped" data-action="status" data-activity-id="${act.activityId}" data-status="skipped" data-active="${status === "skipped"}" aria-pressed="${status === "skipped"}" aria-label="Mark ${escapeHtml(act.name)} as skipped"><span class="material-symbols-outlined" style="font-size: 1rem; vertical-align: middle; margin-right: 4px;">cancel</span>Skip</button>`;
        html += `<button class="status-btn activity-map-link" data-scroll-to="legend-${act.activityId}" type="button" aria-label="Jump to ${escapeHtml(act.name)} on map"><span class="material-symbols-outlined" style="vertical-align: middle; margin-right: 4px;" aria-hidden="true">map</span>Map</button>`;
        html += `</div>`;

        // Expandable details
        html += `<div class="activity-details" id="details-${act.activityId}" role="region" aria-label="Details for ${escapeHtml(act.name)}">`;
        html += renderActivityDetails(act);
        html += `</div>`;

        html += `</div>`;
        return html;
    }

    function renderActivityDetails(act) {
        let html = "";

        // Image
        if (act.image && act.image.url) {
            html += `<img class="detail-image" src="${escapeHtml(act.image.url)}" alt="${escapeHtml(act.image.alt || act.name)}" loading="lazy">`;
        } else {
            html += `<div class="detail-section"><span class="detail-label">Image</span><span class="detail-value not-provided">Not provided</span></div>`;
        }

        // Description
        html += `<div class="detail-section"><div class="detail-label">Description</div><div class="detail-value">${escapeHtml(act.description || "")}</div></div>`;

        // Time
        html += `<div class="detail-section"><div class="detail-label">Time</div><div class="detail-value${act.time === null || act.time === undefined ? " not-provided" : ""}">${act.time !== null && act.time !== undefined ? escapeHtml(act.time) : "Not provided"}</div></div>`;

        // Google Maps Link
        if (act.location && act.location.mapsUrl) {
            html += `<div class="detail-section"><div class="detail-label">Location</div><div class="detail-value"><a href="${escapeHtml(act.location.mapsUrl)}" target="_blank" rel="noopener noreferrer" class="detail-link" aria-label="Open ${escapeHtml(act.name)} in Google Maps"><span class="material-symbols-outlined" style="font-size: 1.125rem;">location_on</span> Open in Google Maps</a></div></div>`;
        } else {
            html += `<div class="detail-section"><div class="detail-label">Location</div><div class="detail-value not-provided">Map data unavailable</div></div>`;
        }

        // Price
        html += `<div class="detail-section"><div class="detail-label">Price</div><div class="detail-value${act.price === null || act.price === undefined ? " not-provided" : ""}">${act.price !== null && act.price !== undefined ? escapeHtml(act.price) : "Not provided"}</div></div>`;

        // Tips
        if (act.tips && act.tips.length > 0) {
            html += `<div class="detail-section"><div class="detail-label">Tips</div><ul class="detail-tips">`;
            act.tips.forEach((t) => {
                html += `<li>${escapeHtml(t)}</li>`;
            });
            html += `</ul></div>`;
        } else {
            html += `<div class="detail-section"><div class="detail-label">Tips</div><div class="detail-value not-provided">Not provided</div></div>`;
        }

        // Photo Spot Tips
        if (act.photoSpotTips && act.photoSpotTips.length > 0) {
            html += `<div class="detail-section"><div class="detail-label">Photo Spot Tips</div><ul class="detail-tips">`;
            act.photoSpotTips.forEach((t) => {
                html += `<li>${escapeHtml(t)}</li>`;
            });
            html += `</ul>`;
            // Photo Examples
            if (act.photoExamples && act.photoExamples.length > 0) {
                html += `<div class="detail-label" style="margin-top:0.65rem;font-size:0.7rem;">Example Photos (tap to open, copy link to save)</div>`;
                html += `<div class="photo-examples">`;
                act.photoExamples.forEach((pe, idx) => {
                    const safeUrl = escapeHtml(pe.url);
                    const safeAlt = escapeHtml(pe.alt);
                    const safeCredit = pe.credit ? escapeHtml(pe.credit) : "";
                    const pageUrl = pe.pageUrl
                        ? escapeHtml(pe.pageUrl)
                        : safeUrl;
                    html += `<div class="photo-example">`;
                    html += `<a href="${pageUrl}" target="_blank" rel="noopener noreferrer" title="Open example photo">`;
                    html += `<img src="${safeUrl}" alt="${safeAlt}" loading="lazy" />`;
                    html += `</a>`;
                    html += `<div class="photo-example-caption">`;
                    html += `<span class="photo-example-credit">${safeCredit ? "📷 " + safeCredit : "📷 Unsplash"}</span>`;
                    html += `<button class="photo-copy-btn" data-copy-url="${pageUrl}" title="Copy photo link">Copy</button>`;
                    html += `</div></div>`;
                });
                html += `</div>`;
            }
            html += `</div>`;
        } else {
            html += `<div class="detail-section"><div class="detail-label">Photo Spot Tips</div><div class="detail-value not-provided">Not provided</div></div>`;
        }

        // Rating Summary
        html += `<div class="detail-section"><div class="detail-label">Rating</div><div class="detail-value${act.ratingSummary === null || act.ratingSummary === undefined ? " not-provided" : ""}">${act.ratingSummary !== null && act.ratingSummary !== undefined ? escapeHtml(act.ratingSummary) : "Not provided"}</div></div>`;

        // Review Links
        if (act.reviewLinks && act.reviewLinks.length > 0) {
            html += `<div class="detail-section"><div class="detail-label">Reviews</div><div class="detail-value">`;
            act.reviewLinks.forEach((rl) => {
                html += `<a href="${escapeHtml(rl.url)}" target="_blank" rel="noopener noreferrer" class="detail-link" aria-label="Read review on ${escapeHtml(rl.sourceName)}">${escapeHtml(rl.sourceName)}</a> `;
            });
            html += `</div></div>`;
        } else {
            html += `<div class="detail-section"><div class="detail-label">Reviews</div><div class="detail-value not-provided">No reviews available</div></div>`;
        }

        // Website
        if (act.websiteUrl) {
            html += `<div class="detail-section"><div class="detail-label">Website</div><div class="detail-value"><a href="${escapeHtml(act.websiteUrl)}" target="_blank" rel="noopener noreferrer" class="detail-link" aria-label="Visit ${escapeHtml(act.name)} website"><span class="material-symbols-outlined" style="font-size: 1.125rem;">language</span> Visit Website</a></div></div>`;
        } else {
            html += `<div class="detail-section"><div class="detail-label">Website</div><div class="detail-value not-provided">Not provided</div></div>`;
        }

        return html;
    }

    function bindActivityEvents() {
        // Toggle expand
        document.querySelectorAll('[data-action="toggle"]').forEach((btn) => {
            btn.addEventListener("click", () => {
                toggleExpand(btn.getAttribute("data-activity-id"));
            });
        });

        // Status buttons
        document.querySelectorAll('[data-action="status"]').forEach((btn) => {
            btn.addEventListener("click", () => {
                const actId = btn.getAttribute("data-activity-id");
                const newStatus = btn.getAttribute("data-status");
                const currentStatus = getActivityStatus(actId);
                // Toggle: if already this status, revert to pending
                if (currentStatus === newStatus) {
                    setActivityStatus(actId, "pending");
                } else {
                    setActivityStatus(actId, newStatus);
                }
            });
        });

        // Filter key toggle
        document
            .querySelectorAll('[data-action="toggle-map-key"]')
            .forEach((btn) => {
                btn.addEventListener("click", () => {
                    toggleMapFilterKey();
                });
            });

        // Cross-link scrolling (legend <-> activity cards)
        document.querySelectorAll("[data-scroll-to]").forEach((el) => {
            const handler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const targetId = el.getAttribute("data-scroll-to");
                const target = document.getElementById(targetId);
                if (target) {
                    target.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                    });
                    target.style.outline = "2px solid var(--brand)";
                    target.style.outlineOffset = "2px";
                    setTimeout(() => {
                        target.style.outline = "";
                        target.style.outlineOffset = "";
                    }, 1500);
                }
            };
            el.addEventListener("click", handler);
            el.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    handler(e);
                }
            });
        });

        // Map marker clicks
        document.querySelectorAll(".map-marker").forEach((marker) => {
            const handler = () => {
                const actId = marker.getAttribute("data-activity-id");
                if (!state.itinerary) return;
                const day = getSelectedDay();
                if (!day) return;
                const act = day.activities.find((a) => a.activityId === actId);
                if (act && act.location && act.location.mapsUrl) {
                    window.open(
                        act.location.mapsUrl,
                        "_blank",
                        "noopener,noreferrer",
                    );
                }
            };
            marker.addEventListener("click", handler);
            marker.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handler();
                }
            });
        });

        // Hotel marker clicks
        document.querySelectorAll(".map-hotel-marker").forEach((marker) => {
            const handler = () => {
                const mapsUrl = marker.getAttribute("data-hotel-maps-url");
                if (mapsUrl) {
                    window.open(mapsUrl, "_blank", "noopener,noreferrer");
                }
            };
            marker.addEventListener("click", handler);
            marker.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handler();
                }
            });
        });

        // Photo copy buttons
        document.querySelectorAll(".photo-copy-btn").forEach((btn) => {
            btn.addEventListener("click", async (e) => {
                e.preventDefault();
                const url = btn.getAttribute("data-copy-url");
                try {
                    await navigator.clipboard.writeText(url);
                    btn.textContent = "Copied!";
                    btn.classList.add("copied");
                    setTimeout(() => {
                        btn.textContent = "Copy";
                        btn.classList.remove("copied");
                    }, 1500);
                } catch {
                    // Fallback for older browsers
                    const ta = document.createElement("textarea");
                    ta.value = url;
                    ta.style.position = "fixed";
                    ta.style.opacity = "0";
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand("copy");
                    document.body.removeChild(ta);
                    btn.textContent = "Copied!";
                    btn.classList.add("copied");
                    setTimeout(() => {
                        btn.textContent = "Copy";
                        btn.classList.remove("copied");
                    }, 1500);
                }
            });
        });
    }

    // ── File Loading ──
    function loadItinerary(data, { restoreFromStorage = false } = {}) {
        state.fileLoadState = "loading";
        updateFileStatus("Loading...", "");

        const errors = validateItinerary(data);
        if (errors.length > 0) {
            state.fileLoadState = "validation_error";
            showValidationErrors(errors);
            updateFileStatus("Validation failed — see errors below.", "error");
            return false;
        }

        // Valid — replace state
        hideValidationErrors();
        state.itinerary = data;
        state.activityStatuses = {};
        state.expandedActivityId = null;
        state.selectedDayId = data.days[0]?.dayId || null;
        state.fileLoadState = "loaded";

        // Initialize activity statuses
        const saved = restoreFromStorage ? loadStatusesFromStorage() : null;
        if (!restoreFromStorage) {
            // Explicit file load — clear any saved progress
            try {
                const key = getStorageKey();
                if (key) localStorage.removeItem(key);
            } catch (_) {}
        }
        data.days.forEach((day) => {
            (day.activities || []).forEach((act) => {
                state.activityStatuses[act.activityId] =
                    (saved && saved[act.activityId]) || "pending";
            });
        });

        updateFileStatus("Itinerary loaded successfully.", "success");
        renderApp();
        return true;
    }

    // Expose for testing
    window.__loadItinerary = loadItinerary;

    function showValidationErrors(errors) {
        const container = document.getElementById("validation-errors");
        const list = document.getElementById("validation-error-list");
        list.innerHTML = errors
            .map((e) => `<li>${escapeHtml(e)}</li>`)
            .join("");
        container.classList.add("visible");
    }

    function hideValidationErrors() {
        const container = document.getElementById("validation-errors");
        container.classList.remove("visible");
    }

    function updateFileStatus(message, statusClass) {
        const el = document.getElementById("file-status");
        if (!el) return;
        el.hidden = false;
        el.textContent = message;
        el.className = "file-status" + (statusClass ? " " + statusClass : "");
    }

    // ── File Input Handler ──
    const fileInputEl = document.getElementById("file-input");
    if (fileInputEl) {
        fileInputEl.addEventListener("change", async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                let data;
                try {
                    data = JSON.parse(text);
                } catch (parseErr) {
                    state.fileLoadState = "validation_error";
                    showValidationErrors([`Invalid JSON: ${parseErr.message}`]);
                    updateFileStatus("Invalid JSON file.", "error");
                    return;
                }
                loadItinerary(data);
            } catch (err) {
                state.fileLoadState = "validation_error";
                showValidationErrors([`Failed to read file: ${err.message}`]);
                updateFileStatus("File read error.", "error");
            }

            // Reset input so the same file can be re-loaded
            e.target.value = "";
        });
    }

    // ── Utility ──
    function escapeHtml(str) {
        if (typeof str !== "string") return "";
        const div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }

    // ── Initialize ──
    async function bootstrapDefaultItinerary() {
        updateFileStatus("Loading default itinerary...", "");
        state.fileLoadState = "loading";

        try {
            const response = await fetch(appConfig.localFallbackDataPath, {
                cache: "no-store",
            });

            if (!response || !response.ok) {
                throw new Error(
                    `Request failed with status ${response ? response.status : "unknown"}.`,
                );
            }

            let data;
            try {
                data = await response.json();
            } catch (parseErr) {
                throw new Error(
                    `Invalid JSON in default itinerary: ${parseErr && parseErr.message ? parseErr.message : "parse error"}`,
                );
            }

            loadItinerary(data, { restoreFromStorage: true });
        } catch (err) {
            state.fileLoadState = "validation_error";
            showValidationErrors([
                `Failed to load default itinerary: ${err && err.message ? err.message : "Unknown error"}`,
            ]);
            updateFileStatus("Failed to load default itinerary.", "error");
        }
    }

    async function bootstrap() {
        renderApp();
        bindUnlockEvents();

        if (isLocalDevelopmentHost()) {
            setUnlockPanelVisible(false);
            await bootstrapDefaultItinerary();
            return;
        }

        setUnlockPanelVisible(true);
        await showDemoItineraryLockedState();
    }

    bootstrap();
})();
