# Public session links

`https://pace-online.de/session?id=<uuid>` is handled by `session-worker.mjs`
inside the existing `pace-online` Cloudflare Worker. Other website paths retain
static asset handling. `assets.run_worker_first` selects only `/session` and
`/session/`; it does not convert the homepage into the app or an SPA fallback.

The handler calls the existing anonymous Supabase `training_share_preview` RPC
once per page request. Only the publishable key is used, never service-role or
user credentials. Incoming cookies, auth, IP and browser headers are not forwarded
to Supabase. No browser JavaScript, tracking, storage, map, geocoding or polling
is introduced. Runtime observability is disabled; operational platform metadata
remains subject to the providers' existing policies.

The anonymous projection contains public session title, time and approximate
area only. An explicit field allowlist and HTML escaping protect both the page
and Open Graph metadata. Private sessions show the private-group notice; a
request action appears only when the backend allows requests. Exact coordinates,
meeting labels/notes and group identifiers are never rendered. Canceled, ended,
archived or otherwise unavailable previews render the unavailable page. There is
no anonymous join/write API: all actions open the same ID in Pace, where auth,
onboarding, membership, approval and capacity are enforced by existing code/RPCs.

WhatsApp and other crawlers receive the same server-rendered title, description
and existing `/assets/pace-social.jpg` image as browsers. Responses are no-store
and noindex; external services may independently cache previously shared cards.
There is no cache-revocation or install-attribution service.

## Installation and association

The website publishes `/.well-known/assetlinks.json` and
`/.well-known/apple-app-site-association` directly as JSON over HTTPS without
redirects. They match the app's session path, package/bundle ID, supplied Apple
Team ID and Android signing fingerprint. Signed app builds also need their
existing manifest/entitlement enabled. A locally signed debug APK uses another
certificate and is not automatically covered by the production fingerprint.
The explicit `com.pace.sports.app://session?id=...` link remains a fallback.
No device verification is implied by passing website tests.

The app is not publicly listed in stores yet. The page says this explicitly.
When real distribution URLs exist, configure Cloudflare Worker variables
`PLAY_STORE_URL` and `APP_STORE_URL`; only credential-free HTTPS URLs are rendered.
`keep_vars:true` preserves dashboard values on deploy. Installing the app does
not transfer a browser's session destination into native storage: users reopen
the original WhatsApp link after installing, then join/submit a request in Pace.

The REST gate receives `x-pace-platform:web` and `x-pace-build:1`. Update `WEB_BUILD`
with future enforced web-build requirements. Global maintenance/API failures
yield a safe 503 page and `Retry-After`, never stale session data.

## Deployment and verification

Cloudflare Workers Builds uses repository `WhatWouldJoeDo/pace-online`, branch
`main`, and `npx wrangler deploy`. The new configuration retains the same Worker
name and domain, adds an assets binding and a small dynamic entry point. No new
provider or Supabase function is deployed. `.assetsignore` explicitly permits
public HTML/assets and the two association files; code, docs, tests and Git/config
files remain inaccessible as assets.

- `node --test scripts/session-sharing.test.mjs`: public/private projections,
  escaping, exact-location exclusion, invalid IDs/methods, API failures, HEAD,
  download URLs and native identity files.
- `PACE_TEST_TOOLS=<external Playwright tools> node scripts/session-sharing-browser.mjs`:
  320/390/1024px layouts, server metadata without JavaScript, request/invite-only
  states, no maps/cookies/external browser requests, overflow and page errors.
- `npx wrangler deploy --config wrangler.jsonc --dry-run`: bundle and asset rules.
- `npx wrangler dev --config wrangler.jsonc --local --port 8788`: real Worker
  routing and response headers. Probe both association paths and an existing
  public session; verify worker source, tests, Git and config paths return 404.

After production deployment verify HTTP 200 and JSON MIME type without redirects
for association files, session-specific HTML for a public session, private-group
redaction and unchanged homepage/legal pages. Real signed Android/iPhone devices
must verify cold/warm launches, login/onboarding continuation and the no-app flow.
