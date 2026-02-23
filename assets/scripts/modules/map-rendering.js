(function (global) {
    "use strict";

    const modules = global.__itineraryModules || (global.__itineraryModules = {});

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
        const missingCount = Math.max(
            0,
            sortedActivities.length - mappedCount,
        );
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
        let svg = `<div class="map-shell">${keyPanel}<div class="map-container"><svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Route map for the day">${renderTileLayer(geometry, width, height)}`;

        if (points.length >= 2) {
            for (let i = 0; i < points.length - 1; i++) {
                svg += `<line class="route-line-shadow" x1="${points[i].x}" y1="${points[i].y}" x2="${points[i + 1].x}" y2="${points[i + 1].y}"/>`;
                svg += `<line class="route-line" x1="${points[i].x}" y1="${points[i].y}" x2="${points[i + 1].x}" y2="${points[i + 1].y}"/>`;
            }
        }

        points.forEach((p) => {
            svg += `<g class="map-marker" data-activity-id="${p.activity.activityId}" role="button" tabindex="0" aria-label="Open ${escapeHtml(p.activity.name)} in Google Maps">`;
            svg += `<circle class="map-marker-shadow" cx="${p.x}" cy="${p.y + 10}" r="6"/>`;
            svg += `<circle class="map-marker-ring" cx="${p.x}" cy="${p.y}" r="10"/>`;
            svg += `<circle class="map-marker-core" cx="${p.x}" cy="${p.y}" r="8"/>`;
            svg += `<text x="${p.x}" y="${p.y}">${p.order}</text>`;
            svg += `</g>`;
        });

        if (hotelPoint) {
            const housePath = `M ${hotelPoint.x} ${hotelPoint.y - 7} L ${hotelPoint.x - 7} ${hotelPoint.y - 1} L ${hotelPoint.x - 7} ${hotelPoint.y + 7} L ${hotelPoint.x - 2} ${hotelPoint.y + 7} L ${hotelPoint.x - 2} ${hotelPoint.y + 2} L ${hotelPoint.x + 2} ${hotelPoint.y + 2} L ${hotelPoint.x + 2} ${hotelPoint.y + 7} L ${hotelPoint.x + 7} ${hotelPoint.y + 7} L ${hotelPoint.x + 7} ${hotelPoint.y - 1} Z`;
            svg += `<g class="map-hotel-marker" role="button" tabindex="0" data-hotel-maps-url="${escapeHtml(hotel.location.mapsUrl)}" aria-label="Open hotel ${escapeHtml(hotel.name)} in Google Maps">`;
            svg += `<circle class="map-hotel-marker-shadow" cx="${hotelPoint.x}" cy="${hotelPoint.y + 10}" r="6"/>`;
            svg += `<circle class="map-hotel-marker-ring" cx="${hotelPoint.x}" cy="${hotelPoint.y}" r="10"/>`;
            svg += `<circle class="map-hotel-marker-core" cx="${hotelPoint.x}" cy="${hotelPoint.y}" r="8"/>`;
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
            html += `<span class="map-legend-item" id="legend-hotel" data-scroll-to="card-${sortedActivities[0].activityId}" role="link" tabindex="0"><span class="map-legend-home-icon" aria-hidden="true"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 5L4 11V20H10V14H14V20H20V11L12 5Z"/></svg></span> Hotel: ${escapeHtml(hotel.name)}</span>`;
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

                const wrappedTileX = ((tileX % tileCount) + tileCount) % tileCount;
                const x = tileX * tileSize - geometry.mapLeft;
                const y = tileY * tileSize - geometry.mapTop;
                const tileUrl = `https://basemaps.cartocdn.com/light_all/${geometry.zoom}/${wrappedTileX}/${tileY}.png`;

                svg += `<image href="${tileUrl}" x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${tileSize}" height="${tileSize}" />`;
            }
        }

        return svg;
    }

    modules.mapRendering = {
        renderMapSection,
    };
})(window);