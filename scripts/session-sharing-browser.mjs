// Browser/server integration with synthetic preview responses only.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { handleSession } from "../session-worker.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(path.join(process.env.PACE_TEST_TOOLS, "package.json"));
const { chromium } = require("playwright-core");
const id = "00000000-0000-4000-8000-000000000099";
let preview = { id, private_group: false, title: "Gemeinsam durch den Englischen Garten", starts_at: "2026-10-20T12:00:00Z", approximate_location: "Englischer Garten, München" };
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  try {
    if (url.pathname === "/session") {
      const response = await handleSession(new Request(url, { method: req.method }), {}, async () => Response.json(preview));
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    if (!url.pathname.startsWith("/assets/")) { res.writeHead(404); res.end(); return; }
    const types = { ".css": "text/css", ".woff2": "font/woff2", ".jpg": "image/jpeg", ".png": "image/png" };
    res.setHeader("Content-Type", types[path.extname(url.pathname)] || "application/octet-stream");
    res.end(await fs.readFile(path.join(root, url.pathname)));
  } catch { res.writeHead(500); res.end(); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, executablePath: process.env.PACE_CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe" });
try {
  for (const javaScriptEnabled of [true, false]) {
    const context = await browser.newContext({ javaScriptEnabled, viewport: { width: 390, height: 844 } });
    const errors = [], external = [];
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    await context.route("**/*", async route => {
      if (new URL(route.request().url()).origin === origin) return route.continue();
      external.push(route.request().url()); await route.abort();
    });
    for (const width of [320, 390, 1024]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`${origin}/session?id=${id}`);
      await page.getByRole("heading", { name: preview.title }).waitFor();
      await page.getByText(/Englischer Garten, München/).waitFor();
      assert.equal(await page.getByRole("link", { name: "In Pace öffnen", exact: true }).getAttribute("href"), `com.pace.sports.app://session?id=${id}`);
      assert.equal(await page.locator('meta[property="og:title"]').getAttribute("content"), `${preview.title} · Pace`);
      assert.equal(await page.locator('a[href*="google.com/maps"],iframe,script').count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      if (javaScriptEnabled && width === 390) await page.screenshot({ path: path.join(root, "../session-preview-public.png") });
    }
    for (const allows_requests of [true, false]) {
      preview = { id, private_group: true, allows_requests, title: "SECRET PRIVATE TITLE", approximate_location: "SECRET AREA", group_id: "SECRET GROUP" };
      await page.reload();
      await page.getByRole("heading", { name: "Diese Session gehört zu einer privaten Pace-Gruppe." }).waitFor();
      assert.doesNotMatch(await page.content(), /SECRET/);
      assert.equal(await page.getByRole("link", { name: "Gruppenbeitritt in Pace anfragen", exact: true }).count(), allows_requests ? 1 : 0);
    }
    assert.deepEqual(await context.cookies(), []);
    assert.deepEqual(external, []);
    assert.deepEqual(errors, []);
    await context.close();
    preview = { id, private_group: false, title: "Gemeinsam durch den Englischen Garten", starts_at: "2026-10-20T12:00:00Z", approximate_location: "Englischer Garten, München" };
  }
  console.log("PASS: mobile/desktop, no-JavaScript WhatsApp metadata, native link, private/request-only gates, no maps/external browser requests/cookies, overflow and page errors.");
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
