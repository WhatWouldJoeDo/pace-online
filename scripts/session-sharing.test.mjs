import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import worker, { handleSession } from "../session-worker.mjs";

const id = "00000000-0000-4000-8000-000000000099";
const publicPreview = { id, private_group: false, title: "Weekend basketball", starts_at: "2026-10-20T12:00:00Z", approximate_location: "Berlin" };
const request = (query = `id=${id}`, method = "GET") => new Request(`https://pace-online.de/session?${query}`, { method });
const mock = (data, status = 200) => async () => Response.json(data, { status });

test("public preview has server-rendered WhatsApp metadata and an exact app destination", async () => {
  let calls = 0;
  const response = await handleSession(request(), {}, async (url, init) => {
    calls++;
    assert.equal(url, "https://exlcrsifebjjawzcdutk.supabase.co/rest/v1/rpc/training_share_preview");
    assert.equal(init.headers["x-pace-platform"], "web");
    assert.equal(init.headers["x-pace-build"], "1");
    assert.ok(init.headers.apikey.startsWith("sb_publishable_"));
    assert.equal(init.headers.Authorization, undefined);
    assert.deepEqual(JSON.parse(init.body), { p_id: id });
    return Response.json({ ...publicPreview, meeting_lat: 52.123456, meeting_lng: 13.654321, meeting_label: "SECRET EXACT PLACE", meeting_note: "SECRET NOTE" });
  });
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.equal(calls, 1);
  assert.match(html, /og:title" content="Weekend basketball · Pace/);
  assert.match(html, /og:description" content="[^"<>]*Berlin/);
  assert.match(html, /com\.pace\.sports\.app:\/\/session\?id=00000000/);
  assert.match(html, /noch nicht öffentlich/);
  assert.doesNotMatch(html, /SECRET|52\.123456|13\.654321|google\.com\/maps|<script/);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(response.headers.get("Referrer-Policy"), "no-referrer");
  assert.match(response.headers.get("Content-Security-Policy"), /script-src 'none'/);
});

test("private-group metadata never contains public-session details or group IDs", async () => {
  for (const allowed of [false, true]) {
    const response = await handleSession(request(), {}, mock({ ...publicPreview, private_group: true, group_id: "SECRET GROUP", allows_requests: allowed }));
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /privaten Pace-Gruppe/);
    assert.doesNotMatch(html, /Weekend basketball|Berlin|SECRET GROUP|20\.10/);
    assert.equal(html.includes("Gruppenbeitritt in Pace anfragen"), allowed);
    if (!allowed) assert.match(html, /keine Beitrittsanfragen möglich/);
  }
});

test("malformed/duplicate IDs and unsupported methods never touch the backend", async () => {
  const noFetch = () => { throw Error("Backend must not be called"); };
  for (const query of ["", "id=bad", `id=${id}&id=${id}`, "id=%3Cscript%3E"])
    assert.equal((await handleSession(request(query), {}, noFetch)).status, 400);
  assert.equal((await handleSession(request(`id=${id}`, "POST"), {}, noFetch)).status, 405);
});

test("unavailable, blocked, malformed and failed previews return safe recoverable pages", async () => {
  assert.equal((await handleSession(request(), {}, mock(null))).status, 404);
  for (const fetcher of [mock({}, 500), mock({ message: "PACE_MAINTENANCE" }, 503), mock({ message: "PACE_UPDATE_REQUIRED" }, 426), mock({ ...publicPreview, id: "wrong" }), mock([]), async () => { throw Error("network unavailable"); }]) {
    const response = await handleSession(request(), {}, fetcher);
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("Retry-After"), "60");
    assert.doesNotMatch(await response.text(), /Weekend basketball|com\.pace\.sports\.app/);
  }
});

test("HTML/metadata is escaped and unsafe download links are discarded", async () => {
  const html = await (await handleSession(request(), {
    PLAY_STORE_URL: "javascript:alert(1)", APP_STORE_URL: "https://user:password@example.org/app",
  }, mock({ ...publicPreview, title: '<script>alert("x")</script>', approximate_location: '"><img src=x onerror=alert(1)>' }))).text();
  assert.doesNotMatch(html, /<script>|<img src=x|javascript:|password@example/);
  assert.match(html, /&lt;script&gt;/);
  const available = await (await handleSession(request(), { PLAY_STORE_URL: "https://play.google.com/store/apps/details?id=com.pace.sports.app" }, mock(publicPreview))).text();
  assert.match(available, /Pace für Android laden/);
  assert.match(available, /danach diesen WhatsApp-Link erneut/);
});

test("HEAD keeps metadata headers without a body; unrelated paths stay on static assets", async () => {
  const response = await handleSession(request(`id=${id}`, "HEAD"), {}, mock(publicPreview));
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "");
  assert.match(response.headers.get("Content-Type"), /text\/html/);
  const response2 = await worker.fetch(new Request("https://pace-online.de/privacy"), { ASSETS: { fetch: async () => new Response("existing static page") } });
  assert.equal(await response2.text(), "existing static page");
});

test("association files match the native session path and supplied signing identity", () => {
  const apple = JSON.parse(readFileSync(new URL("../.well-known/apple-app-site-association", import.meta.url), "utf8"));
  assert.equal(apple.applinks.details[0].appIDs[0], "49W5W29Q2Z.com.pace.sports.app");
  assert.deepEqual(apple.applinks.details[0].components, [{ "/": "/session" }]);
  const android = JSON.parse(readFileSync(new URL("../.well-known/assetlinks.json", import.meta.url), "utf8"));
  assert.equal(android[0].target.package_name, "com.pace.sports.app");
  assert.equal(android[0].target.sha256_cert_fingerprints[0], "24:01:A8:C3:81:11:E4:91:5A:C7:1D:58:24:5E:52:A0:07:D9:66:DE:97:B3:3E:A9:04:DB:16:03:4C:8E:3F:AC");
});
