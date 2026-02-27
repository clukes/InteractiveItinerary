/**
 * Local dev server that serves the static frontend and injects a config
 * override so the app talks to a local wrangler-dev worker instead of
 * the production Cloudflare endpoint.
 *
 * Usage:  node scripts/dev-server.mjs [--port 3000] [--worker-port 8787]
 */

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..");

const args = process.argv.slice(2);
function flag(name, fallback) {
    const idx = args.indexOf(name);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}

const PORT = Number(flag("--port", "3000"));
const WORKER_PORT = Number(flag("--worker-port", "8787"));

const MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon",
    ".webmanifest": "application/manifest+json",
};

const CONFIG_SNIPPET = `
<script>
  // Injected by dev-server — points worker calls at local wrangler dev
  window.__itineraryConfig = {
    workerAuthEndpoint: "http://localhost:${WORKER_PORT}/auth-itinerary",
  };
</script>`;

const server = createServer(async (req, res) => {
    let urlPath = new URL(req.url, `http://localhost:${PORT}`).pathname;
    if (urlPath === "/") urlPath = "/index.html";

    // Prevent directory traversal
    const filePath = join(ROOT, urlPath);
    if (!filePath.startsWith(ROOT)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
    }

    try {
        let body = await readFile(filePath);
        const ext = extname(filePath);
        const contentType = MIME_TYPES[ext] || "application/octet-stream";

        // Inject config override into index.html
        if (urlPath === "/index.html") {
            let html = body.toString("utf-8");
            html = html.replace("</head>", `${CONFIG_SNIPPET}\n</head>`);
            // Add a visual dev-mode indicator
            html = html.replace(
                "</body>",
                `<div style="position:fixed;bottom:4px;left:4px;background:#ff6b00;color:#fff;font:bold 11px/1 sans-serif;padding:2px 6px;border-radius:3px;z-index:99999;pointer-events:none;opacity:0.85">LOCAL DEV</div>\n</body>`,
            );
            body = Buffer.from(html, "utf-8");
        }

        res.writeHead(200, { "Content-Type": contentType });
        res.end(body);
    } catch (err) {
        if (err.code === "ENOENT") {
            res.writeHead(404);
            res.end("Not found");
        } else {
            res.writeHead(500);
            res.end("Internal error");
        }
    }
});

server.listen(PORT, () => {
    console.log(`\n  🌐  Dev frontend:  http://localhost:${PORT}`);
    console.log(`  ⚡  Expecting worker on:  http://localhost:${WORKER_PORT}`);
    console.log(`\n  Tip: run "npm run dev:worker" in another terminal.\n`);
});
