(function (global) {
    "use strict";

    const modules =
        global.__itineraryModules || (global.__itineraryModules = {});

    /**
     * Initialises zoom & pan interaction on the map SVG.
     * Call after the map HTML has been inserted into the DOM.
     * Returns a cleanup function that removes all listeners.
     */
    function initMapInteraction() {
        const container = document.querySelector(".map-container");
        if (!container) return null;

        const svg = container.querySelector("svg");
        if (!svg) return null;

        /* ---------- state ---------- */
        const BASE_WIDTH = 360;
        const BASE_HEIGHT = 280;
        const MIN_ZOOM = 0.5;   // zoomed out (larger viewBox)
        const MAX_ZOOM = 6;     // zoomed in  (smaller viewBox)
        const ZOOM_STEP = 1.25; // multiplicative per click / wheel notch

        let scale = 1;          // 1 = default fit
        let vbX = 0;            // viewBox origin x
        let vbY = 0;            // viewBox origin y

        function currentVBWidth() {
            return BASE_WIDTH / scale;
        }
        function currentVBHeight() {
            return BASE_HEIGHT / scale;
        }

        function clampPan() {
            // Allow panning but keep at least 25% of the map visible
            const w = currentVBWidth();
            const h = currentVBHeight();
            const margin = 0.25;
            vbX = Math.max(-w * (1 - margin), Math.min(BASE_WIDTH - w * margin, vbX));
            vbY = Math.max(-h * (1 - margin), Math.min(BASE_HEIGHT - h * margin, vbY));
        }

        function applyViewBox() {
            const w = currentVBWidth();
            const h = currentVBHeight();
            svg.setAttribute("viewBox", `${vbX} ${vbY} ${w} ${h}`);
            updateCursorStyle();
        }

        function updateCursorStyle() {
            container.classList.toggle("map-zoomed", scale > 1.01);
        }

        /** Convert a client (screen) point to SVG viewBox coordinates */
        function clientToSVG(clientX, clientY) {
            const rect = svg.getBoundingClientRect();
            const relX = (clientX - rect.left) / rect.width;
            const relY = (clientY - rect.top) / rect.height;
            return {
                x: vbX + relX * currentVBWidth(),
                y: vbY + relY * currentVBHeight(),
            };
        }

        /**
         * Zoom towards a focal point (in SVG-viewBox coords).
         * factor > 1 = zoom in, < 1 = zoom out.
         */
        function zoomAtPoint(factor, focalX, focalY) {
            const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scale * factor));
            if (newScale === scale) return;

            // Adjust origin so the focal point stays fixed on screen
            const ratio = scale / newScale;
            vbX = focalX - (focalX - vbX) * ratio;
            vbY = focalY - (focalY - vbY) * ratio;
            scale = newScale;

            clampPan();
            applyViewBox();
        }

        function zoomIn() {
            const cx = vbX + currentVBWidth() / 2;
            const cy = vbY + currentVBHeight() / 2;
            zoomAtPoint(ZOOM_STEP, cx, cy);
        }

        function zoomOut() {
            const cx = vbX + currentVBWidth() / 2;
            const cy = vbY + currentVBHeight() / 2;
            zoomAtPoint(1 / ZOOM_STEP, cx, cy);
        }

        function resetZoom() {
            scale = 1;
            vbX = 0;
            vbY = 0;
            applyViewBox();
        }

        /* ---------- mouse wheel zoom ---------- */
        function onWheel(e) {
            e.preventDefault();
            const focal = clientToSVG(e.clientX, e.clientY);
            const factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
            zoomAtPoint(factor, focal.x, focal.y);
        }

        /* ---------- mouse drag pan ---------- */
        let dragging = false;
        let dragStartX = 0;
        let dragStartY = 0;
        let dragVBStartX = 0;
        let dragVBStartY = 0;
        let dragMoved = false;

        function onMouseDown(e) {
            // Only pan with primary button
            if (e.button !== 0) return;
            dragging = true;
            dragMoved = false;
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            dragVBStartX = vbX;
            dragVBStartY = vbY;
            container.classList.add("map-grabbing");
            e.preventDefault();
        }

        function onMouseMove(e) {
            if (!dragging) return;
            const rect = svg.getBoundingClientRect();
            const dx = ((e.clientX - dragStartX) / rect.width) * currentVBWidth();
            const dy = ((e.clientY - dragStartY) / rect.height) * currentVBHeight();
            if (Math.abs(dx) > 1 || Math.abs(dy) > 1) dragMoved = true;
            vbX = dragVBStartX - dx;
            vbY = dragVBStartY - dy;
            clampPan();
            applyViewBox();
        }

        function onMouseUp() {
            if (!dragging) return;
            dragging = false;
            container.classList.remove("map-grabbing");
        }

        /* ---------- touch pan + pinch zoom ---------- */
        let touchStartDist = 0;
        let touchStartScale = 1;
        let touchStartFocal = { x: 0, y: 0 };
        let touchStartVBX = 0;
        let touchStartVBY = 0;
        let touchPanning = false;
        let touchStartClientX = 0;
        let touchStartClientY = 0;
        let touchMoved = false;

        function getTouchDist(touches) {
            const dx = touches[0].clientX - touches[1].clientX;
            const dy = touches[0].clientY - touches[1].clientY;
            return Math.sqrt(dx * dx + dy * dy);
        }

        function getTouchCenter(touches) {
            return {
                clientX: (touches[0].clientX + touches[1].clientX) / 2,
                clientY: (touches[0].clientY + touches[1].clientY) / 2,
            };
        }

        function onTouchStart(e) {
            if (e.touches.length === 2) {
                // Pinch start
                e.preventDefault();
                touchStartDist = getTouchDist(e.touches);
                touchStartScale = scale;
                const center = getTouchCenter(e.touches);
                touchStartFocal = clientToSVG(center.clientX, center.clientY);
                touchStartVBX = vbX;
                touchStartVBY = vbY;
                touchPanning = false;
            } else if (e.touches.length === 1) {
                // Single-finger pan
                touchPanning = true;
                touchMoved = false;
                touchStartClientX = e.touches[0].clientX;
                touchStartClientY = e.touches[0].clientY;
                touchStartVBX = vbX;
                touchStartVBY = vbY;
            }
        }

        function onTouchMove(e) {
            if (e.touches.length === 2) {
                e.preventDefault();
                const dist = getTouchDist(e.touches);
                const pinchFactor = dist / touchStartDist;
                const newScale = Math.max(
                    MIN_ZOOM,
                    Math.min(MAX_ZOOM, touchStartScale * pinchFactor),
                );
                // Restore original viewBox then re-apply zoom at focal
                scale = touchStartScale;
                vbX = touchStartVBX;
                vbY = touchStartVBY;
                const ratio = scale / newScale;
                vbX = touchStartFocal.x - (touchStartFocal.x - vbX) * ratio;
                vbY = touchStartFocal.y - (touchStartFocal.y - vbY) * ratio;
                scale = newScale;
                clampPan();
                applyViewBox();
            } else if (e.touches.length === 1 && touchPanning) {
                const rect = svg.getBoundingClientRect();
                const dx =
                    ((e.touches[0].clientX - touchStartClientX) / rect.width) *
                    currentVBWidth();
                const dy =
                    ((e.touches[0].clientY - touchStartClientY) / rect.height) *
                    currentVBHeight();
                if (Math.abs(dx) > 2 || Math.abs(dy) > 2) touchMoved = true;
                // Only prevent default scroll if we're zoomed in or doing a significant drag
                if (scale > 1.01 || touchMoved) {
                    e.preventDefault();
                }
                vbX = touchStartVBX - dx;
                vbY = touchStartVBY - dy;
                clampPan();
                applyViewBox();
            }
        }

        function onTouchEnd(e) {
            if (e.touches.length < 2) {
                touchPanning = false;
            }
        }

        /* ---------- double-click / double-tap zoom ---------- */
        function onDblClick(e) {
            e.preventDefault();
            const focal = clientToSVG(e.clientX, e.clientY);
            zoomAtPoint(ZOOM_STEP * ZOOM_STEP, focal.x, focal.y);
        }

        /* ---------- button clicks ---------- */
        function onZoomBtnClick(e) {
            const btn = e.target.closest("[data-map-action]");
            if (!btn) return;
            const action = btn.getAttribute("data-map-action");
            if (action === "zoom-in") zoomIn();
            else if (action === "zoom-out") zoomOut();
            else if (action === "zoom-reset") resetZoom();
        }

        /* ---------- suppress marker clicks when drag-panning ---------- */
        function onClickCapture(e) {
            if (dragMoved || touchMoved) {
                e.stopPropagation();
                e.preventDefault();
                dragMoved = false;
                touchMoved = false;
            }
        }

        /* ---------- bind ---------- */
        const shell = container.closest(".map-shell");

        svg.addEventListener("wheel", onWheel, { passive: false });
        svg.addEventListener("mousedown", onMouseDown);
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
        svg.addEventListener("touchstart", onTouchStart, { passive: false });
        svg.addEventListener("touchmove", onTouchMove, { passive: false });
        svg.addEventListener("touchend", onTouchEnd);
        svg.addEventListener("dblclick", onDblClick);
        svg.addEventListener("click", onClickCapture, true); // capture phase
        if (shell) {
            shell.addEventListener("click", onZoomBtnClick);
        }

        // Initial state
        applyViewBox();

        /* ---------- cleanup ---------- */
        return function cleanup() {
            svg.removeEventListener("wheel", onWheel);
            svg.removeEventListener("mousedown", onMouseDown);
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
            svg.removeEventListener("touchstart", onTouchStart);
            svg.removeEventListener("touchmove", onTouchMove);
            svg.removeEventListener("touchend", onTouchEnd);
            svg.removeEventListener("dblclick", onDblClick);
            svg.removeEventListener("click", onClickCapture, true);
            if (shell) {
                shell.removeEventListener("click", onZoomBtnClick);
            }
        };
    }

    modules.mapInteraction = {
        initMapInteraction,
    };
})(window);
