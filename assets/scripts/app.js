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
    const initMapInteraction =
        window.__itineraryModules?.mapInteraction?.initMapInteraction;
    if (typeof initMapInteraction !== "function") {
        throw new Error(
            "Map interaction module failed to load before app bootstrap.",
        );
    }
    const getTileUrls =
        window.__itineraryModules?.mapRendering?.getTileUrls || null;

    const appConfig = {
        workerAuthEndpoint:
            "https://itinerary-worker.digiconner.workers.dev/auth-itinerary",
        localFallbackDataPath: "assets/data/sample-itinerary.json",
        ...(window.__itineraryConfig || {}),
    };

    const unlockedItineraryStorageKey = "itinerary_unlocked_data_v1";
    const unlockedPasswordStorageKey = "itinerary_unlocked_password_v1";

    // ── App State ──
    const state = {
        itinerary: null,
        selectedDayId: null,
        activityStatuses: {}, // { activityId: 'pending'|'done'|'skipped' }
        expandedActivityId: null,
        fileLoadState: "idle", // idle|loading|loaded|validation_error
        mapFilterKeyHidden: window.innerWidth <= 640,
        isDemoLockedMode: false,
        isDevModeEnabled: false,
        offlineCacheState: "idle", // idle|caching|done|error
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

    function saveUnlockedItineraryToStorage(itinerary) {
        try {
            localStorage.setItem(
                unlockedItineraryStorageKey,
                JSON.stringify(itinerary),
            );
        } catch (_) {
            /* storage unavailable */
        }
    }

    function loadUnlockedItineraryFromStorage() {
        try {
            const raw = localStorage.getItem(unlockedItineraryStorageKey);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== "object") return null;
            return parsed;
        } catch (_) {
            return null;
        }
    }

    function clearUnlockedItineraryFromStorage() {
        try {
            localStorage.removeItem(unlockedItineraryStorageKey);
        } catch (_) {
            /* storage unavailable */
        }
    }

    function saveUnlockPasswordToStorage(password) {
        if (typeof password !== "string" || !password) return;
        try {
            localStorage.setItem(unlockedPasswordStorageKey, password);
        } catch (_) {
            /* storage unavailable */
        }
    }

    function loadUnlockPasswordFromStorage() {
        try {
            const raw = localStorage.getItem(unlockedPasswordStorageKey);
            return typeof raw === "string" && raw ? raw : null;
        } catch (_) {
            return null;
        }
    }

    function clearUnlockPasswordFromStorage() {
        try {
            localStorage.removeItem(unlockedPasswordStorageKey);
        } catch (_) {
            /* storage unavailable */
        }
    }

    // ── Offline Precaching ──

    /**
     * Optimise an external image URL for minimal data usage.
     * - Unsplash: append w=400&q=70 for ~30-50KB instead of multi-MB originals
     * - Already-small or unknown CDNs: leave as-is
     */
    function optimiseImageUrl(url) {
        if (typeof url !== "string" || !url) return url;
        try {
            const parsed = new URL(url);
            // Unsplash image CDN — request small, compressed version
            if (
                parsed.hostname === "images.unsplash.com" ||
                parsed.hostname.endsWith(".unsplash.com")
            ) {
                parsed.searchParams.set("w", "400");
                parsed.searchParams.set("q", "70");
                parsed.searchParams.set("fm", "webp");
                return parsed.toString();
            }
            return url;
        } catch (_) {
            return url;
        }
    }

    /**
     * Collect all cacheable asset URLs from the loaded itinerary.
     * Returns { tileUrls: string[], imageUrls: string[] }
     */
    function collectOfflineAssets(itinerary) {
        const tileUrls = [];
        const imageUrls = [];

        if (!itinerary || !itinerary.days) return { tileUrls, imageUrls };

        const MAP_WIDTH = 360;
        const MAP_HEIGHT = 280;
        const MAP_PADDING = 32;

        itinerary.days.forEach((day) => {
            const activities = day.activities || [];

            // Tile URLs for this day's map
            if (typeof getTileUrls === "function") {
                // Include hotel in geometry if present
                const allPoints = [...activities];
                if (
                    day.hotel &&
                    day.hotel.location &&
                    typeof day.hotel.location.lat === "number" &&
                    typeof day.hotel.location.lng === "number"
                ) {
                    allPoints.push({ location: day.hotel.location });
                }
                const dayTiles = getTileUrls(
                    allPoints,
                    MAP_WIDTH,
                    MAP_HEIGHT,
                    MAP_PADDING,
                );
                dayTiles.forEach((u) => tileUrls.push(u));
            }

            // Image URLs from activities
            activities.forEach((act) => {
                if (act.image && act.image.url) {
                    imageUrls.push(optimiseImageUrl(act.image.url));
                }
                if (act.photoExamples && act.photoExamples.length > 0) {
                    act.photoExamples.forEach((pe) => {
                        if (pe.url) {
                            imageUrls.push(optimiseImageUrl(pe.url));
                        }
                    });
                }
            });
        });

        // Deduplicate
        return {
            tileUrls: [...new Set(tileUrls)],
            imageUrls: [...new Set(imageUrls)],
        };
    }

    /**
     * Kick off background precaching via the Service Worker.
     * Shows progress in the offline status bar.
     */
    function precacheOfflineAssets(itinerary) {
        if (
            !("serviceWorker" in navigator) ||
            !navigator.serviceWorker.controller
        ) {
            return;
        }

        const { tileUrls, imageUrls } = collectOfflineAssets(itinerary);
        const totalAssets = tileUrls.length + imageUrls.length;

        if (totalAssets === 0) return;

        state.offlineCacheState = "caching";
        renderOfflineStatus(0, totalAssets);

        // Track per-batch: cached (newly fetched) + alreadyCached + done flag
        let tilesCached = 0;
        let tilesAlreadyCached = 0;
        let tilesDone = tileUrls.length === 0;
        let imagesCached = 0;
        let imagesAlreadyCached = 0;
        let imagesDone = imageUrls.length === 0;

        function onProgress(e) {
            if (!e.data) return;
            if (e.data.type === "PRECACHE_PROGRESS") {
                // Update per-batch state from the SW
                if (e.data._batch === "tiles") {
                    tilesCached = e.data.cached;
                    tilesAlreadyCached = e.data.alreadyCached || 0;
                    if (e.data.done) tilesDone = true;
                } else if (e.data._batch === "images") {
                    imagesCached = e.data.cached;
                    imagesAlreadyCached = e.data.alreadyCached || 0;
                    if (e.data.done) imagesDone = true;
                }

                // Progress = everything accounted for (newly cached + already cached)
                const totalHandled =
                    tilesCached +
                    tilesAlreadyCached +
                    imagesCached +
                    imagesAlreadyCached;
                renderOfflineStatus(
                    Math.min(totalHandled, totalAssets),
                    totalAssets,
                );

                // Finish when both batches report done
                if (tilesDone && imagesDone) {
                    state.offlineCacheState = "done";
                    renderOfflineStatus(totalAssets, totalAssets);
                    navigator.serviceWorker.removeEventListener(
                        "message",
                        onProgress,
                    );
                }
            }
        }

        navigator.serviceWorker.addEventListener("message", onProgress);

        // Send tile batch
        if (tileUrls.length > 0) {
            navigator.serviceWorker.controller.postMessage({
                type: "PRECACHE_URLS",
                urls: tileUrls,
                cacheName: "itinerary-tiles-v1",
                _batch: "tiles",
            });
        }

        // Send image batch
        if (imageUrls.length > 0) {
            navigator.serviceWorker.controller.postMessage({
                type: "PRECACHE_URLS",
                urls: imageUrls,
                cacheName: "itinerary-images-v1",
                _batch: "images",
            });
        }
    }

    function renderOfflineStatus(cached, total) {
        let container = document.getElementById("offline-status");
        if (!container) {
            container = document.createElement("div");
            container.id = "offline-status";
            container.className = "offline-status";
            container.setAttribute("role", "status");
            container.setAttribute("aria-live", "polite");
            // Insert after header
            const header = document.querySelector(".app-header");
            if (header && header.nextSibling) {
                header.parentNode.insertBefore(container, header.nextSibling);
            } else {
                document.body.prepend(container);
            }
        }

        if (state.offlineCacheState === "done" || cached >= total) {
            container.innerHTML =
                '<span class="offline-status-icon material-symbols-outlined">cloud_done</span>' +
                '<span class="offline-status-text">Saved for offline use</span>';
            container.classList.add("offline-done");
            container.classList.remove("offline-caching");
            // Auto-hide after a few seconds
            setTimeout(() => {
                container.classList.add("offline-hidden");
            }, 4000);
            return;
        }

        const pct = total > 0 ? Math.round((cached / total) * 100) : 0;
        container.classList.add("offline-caching");
        container.classList.remove("offline-done", "offline-hidden");
        container.innerHTML =
            '<span class="offline-status-icon material-symbols-outlined">cloud_download</span>' +
            `<span class="offline-status-text">Saving for offline… ${pct}%</span>` +
            `<div class="offline-progress-track"><div class="offline-progress-bar" style="width:${pct}%"></div></div>`;
    }

    // Expose for testing
    window.__collectOfflineAssets = collectOfflineAssets;
    window.__optimiseImageUrl = optimiseImageUrl;

    function toggleExpand(activityId) {
        const isExpanding = state.expandedActivityId !== activityId;
        state.expandedActivityId =
            state.expandedActivityId === activityId ? null : activityId;
        renderDayContent();
        if (isExpanding) {
            const scrollToCard = () => {
                const card = document.getElementById(`card-${activityId}`);
                if (card && card.scrollIntoView) {
                    card.scrollIntoView({ behavior: "smooth", block: "start" });
                }
            };
            if (typeof requestAnimationFrame === "function") {
                requestAnimationFrame(scrollToCard);
            } else {
                scrollToCard();
            }
        }
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
        updateStickyNavOffset();
    }

    function updateStickyNavOffset() {
        var header = document.querySelector(".app-header");
        var nav = document.querySelector(".day-nav");
        if (header && nav) {
            /** @type {HTMLElement} */ (nav).style.setProperty(
                "--header-height",
                /** @type {HTMLElement} */ (header).offsetHeight + "px",
            );
        }
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
            refreshButton: document.getElementById("refresh-itinerary-button"),
            hardRefreshButton: document.getElementById("hard-refresh-button"),
            devModeButton: document.getElementById("dev-mode-button"),
            help: document.getElementById("unlock-help"),
        };
    }

    async function hardRefreshPage() {
        const unlockElements = getUnlockElements();
        if (unlockElements.hardRefreshButton) {
            unlockElements.hardRefreshButton.disabled = true;
        }

        // Unregister service worker and clear all caches for a clean slate
        try {
            if (
                "serviceWorker" in navigator &&
                typeof navigator.serviceWorker.getRegistrations === "function"
            ) {
                const registrations =
                    await navigator.serviceWorker.getRegistrations();
                await Promise.all(
                    registrations.map((registration) =>
                        registration.unregister(),
                    ),
                );
            }
        } catch (_) {
            /* no-op */
        }

        try {
            if ("caches" in window && typeof caches.keys === "function") {
                const cacheKeys = await caches.keys();
                await Promise.all(
                    cacheKeys.map((cacheKey) => caches.delete(cacheKey)),
                );
            }
        } catch (_) {
            /* no-op */
        }

        // Reset offline cache state
        state.offlineCacheState = "idle";
        const offlineEl = document.getElementById("offline-status");
        if (offlineEl) offlineEl.remove();

        const url = new URL(window.location.href);
        url.searchParams.set("_gh_refresh", String(Date.now()));
        const navigate = window.__itineraryHardRefreshNavigate;
        if (typeof navigate === "function") {
            navigate(url.toString());
            return;
        }
        window.location.assign(url.toString());
    }

    function setRefreshButtonVisible(isVisible) {
        const unlockElements = getUnlockElements();
        if (!unlockElements.refreshButton) return;
        unlockElements.refreshButton.hidden =
            !isVisible || !state.isDevModeEnabled;
    }

    function clearFileStatus() {
        const el = document.getElementById("file-status");
        if (!el) return;
        el.hidden = true;
        el.textContent = "";
        el.className = "file-status";
    }

    function setDevModeEnabled(isEnabled) {
        state.isDevModeEnabled = !!isEnabled;
        const unlockElements = getUnlockElements();
        if (unlockElements.devModeButton) {
            unlockElements.devModeButton.setAttribute(
                "aria-pressed",
                state.isDevModeEnabled ? "true" : "false",
            );
        }

        const shouldShowRefresh =
            !state.isDemoLockedMode &&
            unlockElements.panel &&
            unlockElements.panel.style.display === "none";
        setRefreshButtonVisible(shouldShowRefresh);
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

    async function showDemoItineraryLockedState(statusMessage) {
        state.isDemoLockedMode = true;
        setRefreshButtonVisible(false);
        await bootstrapDefaultItinerary();
        updateFileStatus(
            statusMessage ||
                "Showing demo itinerary. Enter password to unlock your itinerary.",
            "",
        );
    }

    async function unlockItineraryWithPassword(password) {
        const endpoint = appConfig.workerAuthEndpoint;

        if (typeof endpoint !== "string" || !endpoint.trim()) {
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
                serverError ||
                    `Unable to load itinerary (status ${response.status}).`,
            );
        }

        const data = responseJson;
        const loaded = loadItinerary(data, {
            restoreFromStorage: true,
        });

        if (!loaded) {
            throw new Error("Returned itinerary failed validation.");
        }

        saveUnlockedItineraryToStorage(data);
        saveUnlockPasswordToStorage(password);

        state.isDemoLockedMode = false;
        renderHeader();
        setUnlockPanelVisible(false);
        setRefreshButtonVisible(true);
    }

    function bindUnlockEvents() {
        const unlockElements = getUnlockElements();

        if (unlockElements.button && unlockElements.input) {
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
                    if (state.isDevModeEnabled) {
                        updateFileStatus(
                            "Itinerary unlocked successfully.",
                            "success",
                        );
                    } else {
                        clearFileStatus();
                    }
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

        if (unlockElements.devModeButton) {
            unlockElements.devModeButton.addEventListener("click", () => {
                setDevModeEnabled(!state.isDevModeEnabled);
            });
        }

        if (unlockElements.hardRefreshButton) {
            unlockElements.hardRefreshButton.addEventListener("click", () => {
                hardRefreshPage();
            });
        }

        if (unlockElements.refreshButton) {
            unlockElements.refreshButton.addEventListener("click", async () => {
                if (!state.isDevModeEnabled) return;
                clearUnlockedItineraryFromStorage();
                clearUnlockPasswordFromStorage();
                unlockElements.input.value = "";
                setUnlockPanelVisible(true);
                unlockElements.input.focus();
                await showDemoItineraryLockedState(
                    "Server refresh requested. Enter password to load latest itinerary.",
                );
            });
        }
    }

    async function refreshUnlockedItineraryFromServer() {
        const password = loadUnlockPasswordFromStorage();
        if (!password) return false;

        const endpoint = appConfig.workerAuthEndpoint;
        if (typeof endpoint !== "string" || !endpoint.trim()) {
            return false;
        }

        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ password }),
            });

            if (!response || !response.ok) {
                return false;
            }

            const data = await response.json();
            const loaded = loadItinerary(data, {
                restoreFromStorage: true,
            });
            if (!loaded) {
                return false;
            }

            saveUnlockedItineraryToStorage(data);
            state.isDemoLockedMode = false;
            renderHeader();
            setUnlockPanelVisible(false);
            setRefreshButtonVisible(true);

            if (state.isDevModeEnabled) {
                updateFileStatus(
                    "Refreshed unlocked itinerary from server.",
                    "success",
                );
            } else {
                clearFileStatus();
            }

            return true;
        } catch (_) {
            return false;
        }
    }

    function renderHeader() {
        const titleEl = document.getElementById("app-title");
        const datesEl = document.getElementById("app-dates");
        if (!state.itinerary) {
            titleEl.textContent = "Interactive Trip Itinerary";
            datesEl.textContent = "";
            return;
        }
        titleEl.textContent = state.isDemoLockedMode
            ? "DEMO ITINERARY"
            : state.itinerary.title;
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

        // Initialise map zoom & pan interaction
        if (state._mapCleanup) {
            state._mapCleanup();
            state._mapCleanup = null;
        }
        state._mapCleanup = initMapInteraction();
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
            const imgUrl = optimiseImageUrl(act.image.url);
            html += `<img class="detail-image" src="${escapeHtml(imgUrl)}" alt="${escapeHtml(act.image.alt || act.name)}" loading="lazy">`;
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
                    const safeUrl = escapeHtml(optimiseImageUrl(pe.url));
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
        html += `<div class="detail-section"><div class="detail-label">Rating</div><div class="detail-value${act.ratingSummary === null || act.ratingSummary === undefined ? " not-provided" : ""}">${act.ratingSummary !== null && act.ratingSummary !== undefined ? formatRatingSummary(act.ratingSummary) : "Not provided"}</div></div>`;

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

        // Trigger offline precaching in the background
        try {
            precacheOfflineAssets(data);
        } catch (_) {
            /* offline precaching is non-critical */
        }

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
    function formatRatingSummary(text) {
        if (!text) return escapeHtml(text);

        // Extract rating scores (e.g. "Google Maps 4.8/5 (320 reviews); Booking.com 9.4/10 (650 reviews)")
        const scoreRegex =
            /([\w\s.]+?)\s+(\d+(?:\.\d+)?)\/(\d+)\s*\(([\d,]+)\s*reviews?\)/g;
        const scores = [];
        let match;
        while ((match = scoreRegex.exec(text)) !== null) {
            scores.push({
                source: match[1].trim(),
                rating: match[2],
                scale: match[3],
                count: match[4],
            });
        }

        // Extract Likes and Dislikes sections
        const likesMatch = text.match(/Likes:\s*(.+?)(?=\s*Dislikes:|$)/i);
        const dislikesMatch = text.match(/Dislikes:\s*(.+?)$/i);
        const likes = likesMatch
            ? likesMatch[1]
                  .split(";")
                  .map((s) => s.trim())
                  .filter(Boolean)
            : [];
        const dislikes = dislikesMatch
            ? dislikesMatch[1]
                  .split(";")
                  .map((s) => s.trim())
                  .filter(Boolean)
            : [];

        // Extract summary sentence (between scores and Likes)
        let summary = "";
        const afterScores = text
            .replace(scoreRegex, "")
            .replace(/Likes:.*/is, "")
            .replace(/^[;.\s]+/, "")
            .trim();
        if (afterScores) summary = afterScores;

        // If no structured data found, fall back to escaped text
        if (scores.length === 0 && !likes.length && !dislikes.length) {
            return escapeHtml(text);
        }

        let html = "";

        // Score badges
        if (scores.length > 0) {
            html += '<div class="rating-scores">';
            scores.forEach((s) => {
                html += `<span class="rating-badge"><span class="rating-score">${escapeHtml(s.rating)}/${escapeHtml(s.scale)}</span> ${escapeHtml(s.source)} <span class="rating-count">(${escapeHtml(s.count)})</span></span>`;
            });
            html += "</div>";
        }

        // Summary
        if (summary) {
            html += `<p class="rating-summary-text">${escapeHtml(summary)}</p>`;
        }

        // Likes
        if (likes.length > 0) {
            html +=
                '<div class="rating-pros"><span class="rating-list-label">Likes</span><ul>';
            likes.forEach((l) => {
                html += `<li>${escapeHtml(l)}</li>`;
            });
            html += "</ul></div>";
        }

        // Dislikes
        if (dislikes.length > 0) {
            html +=
                '<div class="rating-cons"><span class="rating-list-label">Dislikes</span><ul>';
            dislikes.forEach((d) => {
                html += `<li>${escapeHtml(d)}</li>`;
            });
            html += "</ul></div>";
        }

        return html;
    }

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
            state.isDemoLockedMode = false;
            setUnlockPanelVisible(false);
            setRefreshButtonVisible(false);
            await bootstrapDefaultItinerary();
            return;
        }

        const persistedUnlockedItinerary = loadUnlockedItineraryFromStorage();
        if (persistedUnlockedItinerary) {
            const restored = loadItinerary(persistedUnlockedItinerary, {
                restoreFromStorage: true,
            });
            if (restored) {
                state.isDemoLockedMode = false;
                setUnlockPanelVisible(false);
                setRefreshButtonVisible(true);
                const refreshed = await refreshUnlockedItineraryFromServer();
                if (!refreshed) {
                    if (state.isDevModeEnabled) {
                        updateFileStatus(
                            "Using locally cached unlocked itinerary.",
                            "success",
                        );
                    } else {
                        clearFileStatus();
                    }
                }
                return;
            }
            clearUnlockedItineraryFromStorage();
            clearUnlockPasswordFromStorage();
        }

        setUnlockPanelVisible(true);
        setRefreshButtonVisible(false);
        await showDemoItineraryLockedState();
    }

    function loadVersion() {
        fetch("version.json", { cache: "no-cache" })
            .then(function (r) {
                return r.ok ? r.json() : null;
            })
            .then(function (v) {
                if (!v) return;
                var el = document.getElementById("app-version");
                if (el) el.textContent = "v" + v.build + " (" + v.hash + ")";
            })
            .catch(function () {
                /* version display is non-critical */
            });
    }

    loadVersion();
    window.addEventListener("resize", updateStickyNavOffset);
    bootstrap();
})();
