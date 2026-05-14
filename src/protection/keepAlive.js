/**
 * DAVID V1 — Keep Alive (Layer 5)
 * Copyright © 2025 DJAMEL
 */
"use strict";
const axios = require("axios");
let _t = null;
const rand = (a,b) => Math.floor(Math.random()*(b-a+1))+a;
async function ping() {
  try {
    const api = global.GoatBot?.fcaApi;
    if (!api) return;
    const s = api.getAppState?.();
    if (!s?.length) return;
    const ck = s.map(c => `${c.key}=${c.value}`).join("; ");
    let ua;
    try { ua = require("./stealth").getUA(); } catch(_) {}
    ua = ua || "Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36";
    const r = await axios.head("https://mbasic.facebook.com/", {
      headers: { cookie: ck, "user-agent": ua },
      timeout: 10000, validateStatus: null, maxRedirects: 2,
    });
    if (String(r.headers?.location || "").includes("login"))
      global.log?.warn?.("KEEP_ALIVE", "⚠️ Session may be expired");
  } catch (_) {}
}
function start() {
  if (_t) return;
  const cfg = global.GoatBot?.config?.keepAlive || {};
  if (cfg.enable === false) return;
  const minMs = (cfg.pingIntervalMinMinutes || 8)  * 60000;
  const maxMs = (cfg.pingIntervalMaxMinutes || 15) * 60000;
  function schedule() { _t = setTimeout(async () => { await ping(); _t = null; schedule(); }, rand(minMs, maxMs)); }
  schedule();
}
function stop() { if (_t) { clearTimeout(_t); _t = null; } }
module.exports = { start, stop };
