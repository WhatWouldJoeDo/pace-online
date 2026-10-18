// Existing Cloudflare Worker: only /session is dynamic. No account credentials,
// service-role key, location lookup, analytics, cookies or browser storage.
const SUPABASE_URL = "https://exlcrsifebjjawzcdutk.supabase.co";
const PUBLISHABLE_KEY = "sb_publishable_FXtPs7W2HFgapJc12pGzIA_bnyYmZ_W";
const ORIGIN = "https://pace-online.de";
const WEB_BUILD = "1";
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

const escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[c]);
const limited = (value, max) => typeof value === "string" ? value.slice(0, max) : "";
const downloadUrl = (value) => {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch { return null; }
};

function documentFor({ title, description, id, details = "", actions = "", status = 200, retry = false }, head = false) {
  const canonical = `${ORIGIN}/session${id ? `?id=${id}` : ""}`;
  const headers = {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), browsing-topics=()",
    "Strict-Transport-Security": "max-age=31536000",
    "Content-Security-Policy": "default-src 'self'; script-src 'none'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  };
  if (retry) headers["Retry-After"] = "60";
  return new Response(head ? null : `<!doctype html>
<html lang="de"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#09090b"><meta name="color-scheme" content="dark">
<meta name="robots" content="noindex, nofollow, noarchive"><meta name="referrer" content="no-referrer">
<title>${escape(title)} · Pace</title>
<meta name="description" content="${escape(description)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Pace">
<meta property="og:title" content="${escape(title)} · Pace">
<meta property="og:description" content="${escape(description)}">
<meta property="og:url" content="${escape(canonical)}">
<meta property="og:image" content="${ORIGIN}/assets/pace-social.jpg">
<meta property="og:image:alt" content="Pace – Gemeinsam trainieren">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="${escape(canonical)}"><link rel="icon" href="/assets/favicon.png" type="image/png">
<link rel="stylesheet" href="/assets/fonts/fonts.css"><link rel="stylesheet" href="/assets/session.css">
</head><body><main>
<a class="brand" href="/" aria-label="Pace Startseite">PACE</a>
<section class="card" aria-labelledby="title"><p class="eyebrow">GEMEINSAM TRAINIEREN</p>
<h1 id="title">${escape(title)}</h1><p class="description">${escape(description)}</p>
${details}${actions}
</section><footer aria-label="Weitere Informationen"><a href="/">Über Pace</a><a href="/privacy">Datenschutz</a><a href="/impressum">Impressum</a></footer>
</main></body></html>`, { status, headers });
}

export async function handleSession(request, env = {}, fetchPreview = fetch) {
  const url = new URL(request.url);
  const head = request.method === "HEAD";
  if (!["GET", "HEAD"].includes(request.method))
    return new Response(null, { status: 405, headers: { Allow: "GET, HEAD", "Cache-Control": "no-store" } });
  const ids = url.searchParams.getAll("id");
  if (ids.length !== 1 || !UUID.test(ids[0])) return documentFor({
    title: "Ungültiger Session-Link", description: "Dieser Link ist unvollständig oder ungültig. Bitte lass dir den Session-Link erneut schicken.", status: 400,
  }, head);
  const id = ids[0].toLowerCase();
  let preview;
  try {
    const response = await fetchPreview(`${SUPABASE_URL}/rest/v1/rpc/training_share_preview`, {
      method: "POST",
      headers: { apikey: PUBLISHABLE_KEY, "Content-Type": "application/json", "x-pace-platform": "web", "x-pace-build": WEB_BUILD },
      body: JSON.stringify({ p_id: id }),
      signal: AbortSignal.timeout(7000),
      cache: "no-store",
    });
    if (!response.ok) {
      const error = await response.json().catch(() => null);
      if (error?.message === "PACE_MAINTENANCE") return documentFor({
        id, title: "Eine kurze Pause.", description: "Pace ist vorübergehend nicht verfügbar. Bitte öffne diesen Link später erneut.", status: 503, retry: true,
      }, head);
      throw new Error("Preview unavailable");
    }
    preview = await response.json();
  } catch {
    return documentFor({ id, title: "Gerade keine Verbindung.", description: "Die Session-Vorschau konnte nicht geladen werden. Bitte öffne diesen Link in Kürze erneut.", status: 503, retry: true }, head);
  }
  if (preview === null) return documentFor({
    id, title: "Diese Session ist nicht mehr verfügbar.", description: "Die Session wurde beendet, abgesagt oder ist nicht mehr verfügbar.", status: 404,
  }, head);
  if (!preview || typeof preview !== "object" || preview.id !== id || typeof preview.private_group !== "boolean")
    return documentFor({ id, title: "Vorschau nicht verfügbar.", description: "Bitte öffne diesen Link später erneut.", status: 503, retry: true }, head);

  // Explicit allowlist: never serialize the RPC response into HTML. Even an
  // unexpected backend field cannot leak exact coordinates, labels or notes.
  const privateGroup = preview.private_group;
  const title = privateGroup ? "Diese Session gehört zu einer privaten Pace-Gruppe." : limited(preview.title, 80);
  if (!title) return documentFor({ id, title: "Vorschau nicht verfügbar.", description: "Bitte öffne diesen Link später erneut.", status: 503, retry: true }, head);
  let details = "";
  let description = "Öffne Pace, um die Zugangsberechtigung zu prüfen.";
  if (!privateGroup) {
    const start = new Date(preview.starts_at);
    const date = Number.isFinite(start.getTime()) ? new Intl.DateTimeFormat("de-DE", {
      dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin",
    }).format(start) + " (Berlin)" : "";
    const area = limited(preview.approximate_location, 160);
    description = [date, area, "Sei bei dieser Pace-Session dabei."].filter(Boolean).join(" · ");
    details = '<p class="privacy">Den genauen Treffpunkt siehst du in Pace nach deinem Beitritt oder der Genehmigung deiner Anfrage.</p>';
  } else if (preview.allows_requests === true) {
    description = "Du kannst in Pace eine Anfrage stellen, um der Gruppe beizutreten. Die Gruppe entscheidet über deine Aufnahme.";
  } else {
    description = "Nur Gruppenmitglieder können diese Session öffnen. Für diese Gruppe sind keine Beitrittsanfragen möglich.";
  }
  const openLabel = privateGroup && preview.allows_requests === true ? "Gruppenbeitritt in Pace anfragen" : "In Pace öffnen";
  let actions = `<a class="button" href="com.pace.sports.app://session?id=${id}">${escape(openLabel)}</a>`;
  const stores = [[downloadUrl(env.PLAY_STORE_URL), "Pace für Android laden"], [downloadUrl(env.APP_STORE_URL), "Pace fürs iPhone laden"]];
  for (const [href, label] of stores) if (href) actions += `<a class="button secondary" href="${escape(href)}" rel="noreferrer">${label}</a>`;
  actions += stores.some(([href]) => href)
    ? '<p class="note">Pace noch nicht installiert? Lade die App herunter und öffne danach diesen WhatsApp-Link erneut. Dein Beitritt wird in der App bestätigt.</p>'
    : '<p class="note">Pace ist aktuell in der Testphase und noch nicht öffentlich in den App-Stores verfügbar. Wenn du bereits einen Testzugang hast, installiere Pace darüber und öffne danach diesen Link erneut.</p><a class="support" href="mailto:support@pace-online.de">Fragen zum Testzugang?</a>';
  return documentFor({ id, title, description, details, actions }, head);
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === "/session" || path === "/session/") return handleSession(request, env);
    return env.ASSETS.fetch(request);
  },
};
