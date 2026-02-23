# Privacy Plan: Keep GitHub Pages, Host Itinerary Privately

## Goal
Keep the site UI on GitHub Pages, but store and gate the real itinerary somewhere else with a password flow.

## Important security note
If a password is automatically retrievable by the same public page (without separate authentication), it is not truly secret.  
So this plan uses **out-of-band password delivery** (for example Bitwarden/1Password/Signal) and keeps verification server-side.

---

## Architecture (free + easy)
- **Public:** GitHub Pages hosts only HTML/CSS/JS.
- **Private:** Cloudflare Worker API stores/protects itinerary access.
- **Password:** Stored as a Cloudflare Worker secret (never in repo).
- **Data:** Itinerary JSON stored in Worker KV (or hardcoded in Worker env for MVP).
- **Client flow:**
  1. User opens GitHub Pages site.
  2. User enters password they obtained elsewhere.
  3. Frontend sends password over HTTPS to Worker endpoint.
  4. Worker verifies password and returns itinerary JSON only if valid.

---

## Step-by-step checklist

### 1) Sanitize GitHub Pages repo first
- [x] **[DONE]** Remove real itinerary files from public repo (`itinerary.csv`, `seville-itinerary.json`, etc.).
- [x] **[DONE]** Replace with sample/redacted data for demo behavior.
- [x] **[MANUAL]** If sensitive data was already pushed, rewrite history and force-push cleaned history.

### 2) Create Cloudflare account + resources (free tier)
- [x] **[MANUAL]** Create/log into Cloudflare account.
- [x] **[MANUAL]** Create a **Worker** (for API).
- [x] **[MANUAL]** Create a **KV namespace** (for itinerary JSON).
- [x] **[MANUAL]** Add Worker secret `ITINERARY_PASSWORD`.
- [x] **[MANUAL]** Put itinerary JSON into KV key like `active-itinerary`.

### 3) Build the private API in Worker
- [x] Add `POST /auth-itinerary` endpoint in Worker.
- [x] Read password from request body and compare to `ITINERARY_PASSWORD` on server.
- [x] On success, fetch JSON from KV and return it.
- [x] On failure, return `401 Unauthorized`.
- [x] Add CORS allowlist for your GitHub Pages origin only (for example `https://<username>.github.io`).

### 4) Update frontend (GitHub Pages app)
- [x] Add an unlock UI: password field + “Load Itinerary” button.
- [x] Remove default loading of private local JSON.
- [x] On submit, call Worker `POST /auth-itinerary`.
- [x] If success, pass returned JSON into existing render pipeline.
- [x] If failure, show friendly error and do not reveal details.

### 5) Password retrieval “elsewhere” (required)
- [ ] **[MANUAL]** Choose out-of-band password delivery:
  - Shared vault item (Bitwarden/1Password), or
  - Encrypted message app (Signal), or
  - Manual one-time distribution.
- [ ] **[MANUAL]** Do **not** store this password in repo, JS, or public config.
- [ ] **[MANUAL]** Rotate password after any accidental exposure.

### 6) Deploy and verify
- [ ] Deploy Worker and note endpoint URL.
- [ ] Update frontend config with Worker URL.
- [ ] Deploy GitHub Pages.
- [ ] Test with correct and wrong password.
- [ ] Confirm no real itinerary data is visible in page source/network until successful auth.

---

## Minimal implementation tasks for this repo
- [x] Add config constant in frontend for Worker endpoint URL.
- [x] Add password prompt UI in `index.html`.
- [x] Add auth fetch logic in `assets/scripts/app.js`.
- [x] Keep fallback sample data only for local/dev testing.

---

## Progress Update (2026-02-23)
- Completed repo sanitization commit on branch `privacy-sanitize-itinerary`:
  - Replaced public files with sample/redacted data:
    - `itinerary.csv`
    - `seville-itinerary.json`
    - `assets/data/default-itinerary.json`
- Restored private copies locally (git-ignored) for personal use:
  - `private/local-itineraries/seville-itinerary.private.json`
  - `private/local-itineraries/itinerary.private.csv`
- Added local protection in `.gitignore`:
  - `private/local-itineraries/`
- Still pending:
  - Git history rewrite + force-push cleanup
  - Worker deployment + endpoint URL wiring
  - Final production verification on GitHub Pages

---

## Optional hardening (still free)
- [ ] Add rate limiting in Worker (basic IP throttle).
- [ ] Add short lockout after repeated failures.
- [ ] Return generic error messages only.
- [ ] Add simple audit logs (failed attempts count).

---

## What remains manual vs code
### Manual actions (you)
- Cloudflare account/Worker/KV setup
- Secret creation and rotation
- Out-of-band password sharing
- Repo cleanup/history rewrite if needed

### Code actions (can be implemented in this project)
- Password prompt UI
- API call + error handling
- Parsing/rendering returned itinerary JSON

---

## Success criteria
- GitHub Pages contains no real itinerary files.
- Real itinerary only exists in external private service (Worker KV).
- Password is not embedded in frontend code.
- Itinerary data is returned only after server-side password verification.
