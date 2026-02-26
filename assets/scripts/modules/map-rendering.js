(function (global) {
    "use strict";

    const modules =
        global.__itineraryModules || (global.__itineraryModules = {});

    function renderMapSection(
        sortedActivities,
        mapValidActivities,
        hotel,
        { mapFilterKeyHidden, escapeHtml },
    ) {
        const hasHotelMapData =
            hotel &&
            typeof hotel === "object" &&
            typeof hotel.name === "string" &&
            hotel.name.trim().length > 0 &&
            hotel.location &&
            typeof hotel.location === "object" &&
            typeof hotel.location.lat === "number" &&
            typeof hotel.location.lng === "number" &&
            typeof hotel.location.mapsUrl === "string" &&
            hotel.location.mapsUrl.trim().length > 0;
        const mappedCount = mapValidActivities.length;
        const missingCount = Math.max(0, sortedActivities.length - mappedCount);
        let html =
            '<div class="map-section"><h2>Route Map</h2><div class="map-subtitle">A little visual journey for your day.</div>';
        const missingPill =
            missingCount > 0
                ? `<span class="map-meta-pill"><span class="material-symbols-outlined" style="font-size: 1rem;">location_off</span>${missingCount} missing location${missingCount === 1 ? "" : "s"}</span>`
                : "";
        const hotelPill = hasHotelMapData
            ? '<span class="map-meta-pill"><span class="material-symbols-outlined" style="font-size: 1rem;">home</span>Hotel</span>'
            : "";
        html += `<div class="map-meta"><span class="map-meta-pill"><span class="material-symbols-outlined" style="font-size: 1rem;">route</span>${mappedCount} mapped stop${mappedCount === 1 ? "" : "s"}</span>${hotelPill}${missingPill}</div>`;

        if (mapValidActivities.length === 0 && !hasHotelMapData) {
            html +=
                '<div class="map-container"><div class="map-unavailable"><span class="material-symbols-outlined" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;">map</span>Map data unavailable for this day\'s activities.</div></div>';
            const missingMap = sortedActivities.filter(
                (a) =>
                    !a.location ||
                    typeof a.location.lat !== "number" ||
                    typeof a.location.lng !== "number",
            );
            if (missingMap.length > 0) {
                html += '<div class="map-legend">';
                missingMap.forEach((a) => {
                    html += `<span class="map-legend-item" id="legend-${a.activityId}" data-scroll-to="card-${a.activityId}" role="link" tabindex="0"><span class="map-badge"><span class="material-symbols-outlined" style="font-size: 1rem;">location_off</span> Map unavailable</span> ${escapeHtml(a.name)}</span>`;
                });
                html += "</div>";
            }
            html += "</div>";
            return html;
        }

        const padding = 32;
        const width = 360;
        const height = 280;
        const geometryActivities = hasHotelMapData
            ? [
                  ...mapValidActivities,
                  {
                      location: {
                          lat: hotel.location.lat,
                          lng: hotel.location.lng,
                      },
                  },
              ]
            : mapValidActivities;
        const geometry = buildMapGeometry(
            geometryActivities,
            width,
            height,
            padding,
        );
        const points = mapValidActivities.map((activity, index) => {
            const worldPoint = latLngToWorld(
                activity.location.lat,
                activity.location.lng,
                geometry.zoom,
            );
            return {
                x: worldPoint.x - geometry.mapLeft,
                y: worldPoint.y - geometry.mapTop,
                order: index + 1,
                activity,
            };
        });
        const hotelPoint = hasHotelMapData
            ? (() => {
                  const worldPoint = latLngToWorld(
                      hotel.location.lat,
                      hotel.location.lng,
                      geometry.zoom,
                  );
                  return {
                      x: worldPoint.x - geometry.mapLeft,
                      y: worldPoint.y - geometry.mapTop,
                  };
              })()
            : null;

        const missingKeyItem =
            missingCount > 0
                ? `<span class="map-overlay-item missing"><span class="material-symbols-outlined map-overlay-icon">location_off</span>No map data</span>`
                : "";
        const hotelKeyItem = hasHotelMapData
            ? `<span class="map-overlay-item hotel"><span class="material-symbols-outlined map-overlay-icon">home</span>Hotel</span>`
            : "";
        const keyButtonLabel = mapFilterKeyHidden ? "Show key" : "Hide key";
        const keyButtonIcon = mapFilterKeyHidden
            ? "visibility"
            : "visibility_off";
        const keyButton = `<button class="map-key-toggle" data-action="toggle-map-key" type="button" aria-label="${keyButtonLabel} filter key"><span class="material-symbols-outlined" aria-hidden="true">${keyButtonIcon}</span>${keyButtonLabel}</button>`;
        const keyPanelContent = mapFilterKeyHidden
            ? ""
            : `<div class="map-overlay-grid" aria-hidden="true"><span class="map-overlay-item route"><span class="material-symbols-outlined map-overlay-icon">route</span>Route path</span><span class="map-overlay-item stop"><span class="material-symbols-outlined map-overlay-icon">location_on</span>Stops</span>${hotelKeyItem}${missingKeyItem}<span class="map-overlay-item tap"><span class="material-symbols-outlined map-overlay-icon">touch_app</span>Tap to open</span></div>`;
        const keyPanel = `<div class="map-overlay-key"><div class="map-overlay-header"><div class="map-overlay-title" aria-hidden="true"><span class="material-symbols-outlined" style="font-size: 0.95rem;">tune</span>Filter Key</div>${keyButton}</div>${keyPanelContent}</div>`;
        const zoomControls =
            `<div class="map-zoom-controls" aria-label="Map zoom controls">` +
            `<button class="map-zoom-btn" data-map-action="zoom-in" type="button" aria-label="Zoom in"><span class="material-symbols-outlined">add</span></button>` +
            `<button class="map-zoom-btn" data-map-action="zoom-out" type="button" aria-label="Zoom out"><span class="material-symbols-outlined">remove</span></button>` +
            `<button class="map-zoom-btn" data-map-action="zoom-reset" type="button" aria-label="Reset zoom"><span class="material-symbols-outlined">fit_screen</span></button>` +
            `</div>`;
        let svg = `<div class="map-shell">${keyPanel}${zoomControls}<div class="map-container" data-base-viewbox="0 0 ${width} ${height}"><svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Route map for the day">${renderTileLayer(geometry, width, height)}`;

        if (points.length >= 2) {
            for (let i = 0; i < points.length - 1; i++) {
                svg += `<line class="route-line-shadow" x1="${points[i].x}" y1="${points[i].y}" x2="${points[i + 1].x}" y2="${points[i + 1].y}"/>`;
                svg += `<line class="route-line" x1="${points[i].x}" y1="${points[i].y}" x2="${points[i + 1].x}" y2="${points[i + 1].y}"/>`;
            }
        }

        points.forEach((p) => {
            svg += `<g class="map-marker" data-activity-id="${p.activity.activityId}" data-marker-x="${p.x}" data-marker-y="${p.y}" role="button" tabindex="0" aria-label="Open ${escapeHtml(p.activity.name)} in Google Maps">`;
            svg += `<circle class="map-marker-shadow" cx="${p.x}" cy="${p.y + 10}" r="6"/>`;
            svg += `<circle class="map-marker-ring" cx="${p.x}" cy="${p.y}" r="10"/>`;
            svg += `<circle class="map-marker-core" cx="${p.x}" cy="${p.y}" r="8"/>`;
            svg += `<text x="${p.x}" y="${p.y}">${p.order}</text>`;
            svg += `</g>`;
        });

        if (hotelPoint) {
            const cx = hotelPoint.x;
            const cy = hotelPoint.y;
            const headY = cy - 14;
            const pinPath = `M ${cx} ${cy} C ${cx - 5} ${cy - 7} ${cx - 9} ${cy - 10} ${cx - 9} ${headY} A 9 9 0 1 1 ${cx + 9} ${headY} C ${cx + 9} ${cy - 10} ${cx + 5} ${cy - 7} ${cx} ${cy} Z`;
            const housePath = `M ${cx} ${headY - 4.5} L ${cx - 4.5} ${headY - 0.5} L ${cx - 3} ${headY - 0.5} L ${cx - 3} ${headY + 4} L ${cx - 1} ${headY + 4} L ${cx - 1} ${headY + 1.5} L ${cx + 1} ${headY + 1.5} L ${cx + 1} ${headY + 4} L ${cx + 3} ${headY + 4} L ${cx + 3} ${headY - 0.5} L ${cx + 4.5} ${headY - 0.5} Z`;
            svg += `<g class="map-hotel-marker" role="button" tabindex="0" data-marker-x="${cx}" data-marker-y="${cy}" data-hotel-maps-url="${escapeHtml(hotel.location.mapsUrl)}" aria-label="Open hotel ${escapeHtml(hotel.name)} in Google Maps">`;
            svg += `<ellipse class="map-hotel-marker-shadow" cx="${cx}" cy="${cy + 3}" rx="5" ry="2"/>`;
            svg += `<path class="map-hotel-marker-pin" d="${pinPath}"/>`;
            svg += `<circle class="map-hotel-marker-inner" cx="${cx}" cy="${headY}" r="6.5"/>`;
            svg += `<path class="map-hotel-marker-house" d="${housePath}"/>`;
            svg += `</g>`;
        }

        svg += "</svg></div></div>";
        html += svg;

        const missingMap = sortedActivities.filter(
            (a) =>
                !a.location ||
                typeof a.location.lat !== "number" ||
                typeof a.location.lng !== "number",
        );
        html += '<div class="map-legend">';
        if (hasHotelMapData) {
            html += `<span class="map-legend-item" id="legend-hotel" data-scroll-to="card-${sortedActivities[0].activityId}" role="link" tabindex="0"><span class="map-legend-home-icon" aria-hidden="true"><svg viewBox="0 0 24 30" xmlns="http://www.w3.org/2000/svg"><path class="map-legend-pin-path" d="M12 28 C9 23 3 17 3 11 A9 9 0 1 1 21 11 C21 17 15 23 12 28Z"/><circle cx="12" cy="11" r="6.5" fill="#fff"/><path d="M12 7 L7.5 10.5 L9 10.5 L9 14.5 L10.8 14.5 L10.8 12 L13.2 12 L13.2 14.5 L15 14.5 L15 10.5 L16.5 10.5Z" fill="#2f6cf5"/></svg></span> Hotel: ${escapeHtml(hotel.name)}</span>`;
        }
        mapValidActivities.forEach((a, i) => {
            html += `<span class="map-legend-item" id="legend-${a.activityId}" data-scroll-to="card-${a.activityId}" role="link" tabindex="0"><span class="map-legend-dot"></span> ${i + 1}. ${escapeHtml(a.name)}</span>`;
        });
        if (missingMap.length > 0) {
            missingMap.forEach((a) => {
                html += `<span class="map-legend-item" id="legend-${a.activityId}" data-scroll-to="card-${a.activityId}" role="link" tabindex="0"><span class="map-badge"><span class="material-symbols-outlined" style="font-size: 1rem;">location_off</span> Map unavailable</span> ${escapeHtml(a.name)}</span>`;
            });
        }
        html += "</div></div>";
        return html;
    }

    function buildMapGeometry(activities, width, height, padding) {
        const availableWidth = width - padding * 2;
        const availableHeight = height - padding * 2;
        let zoom = 15;

        for (let z = 15; z >= 2; z--) {
            const worldPoints = activities.map((a) =>
                latLngToWorld(a.location.lat, a.location.lng, z),
            );
            const bounds = getBounds(worldPoints);
            if (
                bounds.width <= availableWidth &&
                bounds.height <= availableHeight
            ) {
                zoom = z;
                break;
            }
        }

        const worldPoints = activities.map((a) =>
            latLngToWorld(a.location.lat, a.location.lng, zoom),
        );
        const bounds = getBounds(worldPoints);
        const centerX = bounds.minX + bounds.width / 2;
        const centerY = bounds.minY + bounds.height / 2;
        const mapLeft = centerX - width / 2;
        const mapTop = centerY - height / 2;

        return {
            zoom,
            mapLeft,
            mapTop,
            points: worldPoints.map((point, i) => ({
                x: point.x - mapLeft,
                y: point.y - mapTop,
                order: i + 1,
                activity: activities[i],
            })),
        };
    }

    function latLngToWorld(lat, lng, zoom) {
        const tileSize = 256;
        const scale = 2 ** zoom * tileSize;
        const clampedLat = Math.max(-85.05112878, Math.min(85.05112878, lat));
        const sinLat = Math.sin((clampedLat * Math.PI) / 180);
        const x = ((lng + 180) / 360) * scale;
        const y =
            (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) *
            scale;
        return { x, y };
    }

    function getBounds(points) {
        const xs = points.map((p) => p.x);
        const ys = points.map((p) => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        return {
            minX,
            minY,
            maxX,
            maxY,
            width: Math.max(1, maxX - minX),
            height: Math.max(1, maxY - minY),
        };
    }

    function renderTileLayer(geometry, width, height) {
        const tileSize = 256;
        const tileCount = 2 ** geometry.zoom;
        const minTileX = Math.floor(geometry.mapLeft / tileSize);
        const maxTileX = Math.floor((geometry.mapLeft + width) / tileSize);
        const minTileY = Math.floor(geometry.mapTop / tileSize);
        const maxTileY = Math.floor((geometry.mapTop + height) / tileSize);

        let svg = "";

        for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
            for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
                if (tileY < 0 || tileY >= tileCount) continue;

                const wrappedTileX =
                    ((tileX % tileCount) + tileCount) % tileCount;
                const x = tileX * tileSize - geometry.mapLeft;
                const y = tileY * tileSize - geometry.mapTop;
                const tileUrl = `https://basemaps.cartocdn.com/light_all/${geometry.zoom}/${wrappedTileX}/${tileY}.png`;

                svg += `<image href="${tileUrl}" x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${tileSize}" height="${tileSize}" />`;
            }
        }

        return svg;
    }

    /**
     * Compute all tile URLs needed for a set of activities.
     * Used by the offline precacher to cache tiles without rendering.
     */
    function getTileUrls(activities, width, height, padding) {
        if (!activities || activities.length === 0) return [];
        const mapValid = activities.filter(
            (a) =>
                a.location &&
                typeof a.location.lat === "number" &&
                typeof a.location.lng === "number",
        );
        if (mapValid.length === 0) return [];

        const geometry = buildMapGeometry(mapValid, width, height, padding);
        const tileSize = 256;
        const tileCount = 2 ** geometry.zoom;
        const minTileX = Math.floor(geometry.mapLeft / tileSize);
        const maxTileX = Math.floor((geometry.mapLeft + width) / tileSize);
        const minTileY = Math.floor(geometry.mapTop / tileSize);
        const maxTileY = Math.floor((geometry.mapTop + height) / tileSize);

        const urls = [];
        for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
            for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
                if (tileY < 0 || tileY >= tileCount) continue;
                const wrappedTileX =
                    ((tileX % tileCount) + tileCount) % tileCount;
                urls.push(
                    `https://basemaps.cartocdn.com/light_all/${geometry.zoom}/${wrappedTileX}/${tileY}.png`,
                );
            }
        }
        return urls;
    }

    modules.mapRendering = {
        renderMapSection,
        getTileUrls,
        buildMapGeometry,
        latLngToWorld,
    };
})(window);
