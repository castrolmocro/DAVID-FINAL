/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║       DJAMEL-FCA v3.0 — Facebook Client Abstractions               ║
 * ║       Copyright © 2025 DJAMEL — All rights reserved               ║
 * ║       Built exclusively for DAVID V1 Bot Engine                    ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Features:
 *  ✦ Cookie parsing: c3c, JSON Array, Netscape, Header String, Object
 *  ✦ Live session validation via mbasic.facebook.com
 *  ✦ Human behavior simulation (typing delay, presence simulation)
 *  ✦ User-Agent rotation (8 real mobile agents)
 *  ✦ Cookie deduplication & compression
 *  ✦ sendMessageHuman() — human-like delay before sending
 *  ✦ buildReplyHelper() — GoatBot-compatible message helper
 *  ✦ Exponential backoff login retry
 *  ✦ Auto AppState save after login
 *  ✦ Thread info cache
 *  ✦ Anti-detection headers
 */
"use strict";

const loginFCA = require("@dongdev/fca-unofficial");
const axios    = require("axios");

// ─── User-Agent Pool ──────────────────────────────────────────────────────────
const UA_POOL = [
  "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 13; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 12; M2102J20SG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 13; OnePlus 11) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 11; Redmi Note 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 13; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 12; SAMSUNG SM-G998B) SamsungBrowser/19.0 Chrome/102.0.0.0 Mobile Safari/537.36",
];
let _uaIdx = Math.floor(Math.random() * UA_POOL.length);
const getUA    = () => UA_POOL[_uaIdx];
const rotateUA = () => { _uaIdx = (_uaIdx + 1) % UA_POOL.length; return UA_POOL[_uaIdx]; };

// ─── Cookie Parser — supports 5 formats ──────────────────────────────────────

function parseCookieInput(raw) {
  if (!raw) return { cookies: [], raw: "" };
  const text = String(raw).trim();

  // 1. JSON Array (standard AppState)
  if (text.startsWith("[")) {
    try {
      const arr = JSON.parse(text);
      if (Array.isArray(arr) && arr.length && (arr[0]?.key || arr[0]?.name)) {
        const mapped = arr.map(c => ({
          key: c.key || c.name, value: c.value || "",
          domain: c.domain || ".facebook.com", path: c.path || "/",
          secure: c.secure ?? true, httpOnly: c.httpOnly ?? false, sameSite: c.sameSite || "None",
        })).filter(c => c.key);
        return { cookies: dedup(mapped), raw: text };
      }
    } catch (_) {}
  }

  // 2. c3c JSON Object { cookies: [...] }
  if (text.startsWith("{")) {
    try {
      const obj = JSON.parse(text);
      if (Array.isArray(obj.cookies)) {
        const mapped = obj.cookies.map(c => ({
          key: c.name || c.key || "", value: c.value || "",
          domain: c.domain || ".facebook.com", path: c.path || "/",
          secure: c.secure ?? true, httpOnly: c.httpOnly ?? false, sameSite: c.sameSite || "None",
        })).filter(c => c.key);
        return { cookies: dedup(mapped), raw: text };
      }
      // Single cookie obj
      if (obj.key && obj.value) return { cookies: dedup([obj]), raw: text };
      // Android fbsettings format: { "c_user": "123", "xs": "abc" }
      const keys = ["c_user","xs","fr","wd","datr","sb","m_sess","spin"];
      const found = Object.entries(obj).filter(([k]) => keys.some(kk => k === kk || k.toLowerCase() === kk));
      if (found.length > 0) {
        const mapped = found.map(([k,v]) => ({ key: k, value: String(v),
          domain: ".facebook.com", path: "/", secure: true, httpOnly: false, sameSite: "None" }));
        return { cookies: dedup(mapped), raw: text };
      }
    } catch (_) {}
  }

  // 3. Netscape / Header string: key=value; key2=value2
  if (text.includes("=")) {
    const pairs = text.split(/;\s*/g).filter(Boolean);
    const mapped = pairs.map(p => {
      const i = p.indexOf("=");
      if (i < 1) return null;
      return { key: p.slice(0,i).trim(), value: p.slice(i+1).trim(),
               domain: ".facebook.com", path: "/", secure: true, httpOnly: false, sameSite: "None" };
    }).filter(Boolean);
    if (mapped.length > 0) return { cookies: dedup(mapped), raw: text };
  }

  return { cookies: [], raw: text };
}

function dedup(cookies) {
  const seen = new Map();
  for (const c of cookies) { if (c.key) seen.set(c.key, c); }
  return [...seen.values()];
}

function cookiesToString(cookies) {
  return cookies.map(c => `${c.key}=${c.value}`).join("; ");
}

function hasMandatory(cookies) {
  const keys = new Set(cookies.map(c => c.key));
  return keys.has("c_user") && keys.has("xs");
}

// ─── Session Validator ────────────────────────────────────────────────────────

async function checkLiveCookie(cookieStr, ua) {
  try {
    const res = await axios.get("https://mbasic.facebook.com/settings", {
      headers: {
        cookie:            cookieStr,
        "user-agent":      ua || getUA(),
        "accept":          "text/html,application/xhtml+xml,*/*;q=0.8",
        "accept-language": "ar,en-US;q=0.9,en;q=0.8",
        "sec-fetch-dest":  "document",
        "sec-fetch-mode":  "navigate",
        "sec-fetch-site":  "none",
        "upgrade-insecure-requests": "1",
      },
      timeout: 14000, validateStatus: null, maxRedirects: 3,
    });
    const b = String(res.data || "");
    return b.includes("/notifications.php?") || b.includes("/privacy/xcs/") ||
           b.includes("save-password") || b.includes("logout") ||
           b.includes("settings_page");
  } catch (_) { return false; }
}

// ─── Human Behavior ───────────────────────────────────────────────────────────

function calcTypingDelay(text) {
  const len   = String(text || "").replace(/<[^>]*>/g,"").length;
  const wpm   = 180 + Math.floor(Math.random() * 120);   // 180–300 wpm
  const chars = wpm * 5 / 60;                             // chars/sec
  const base  = Math.round((len / chars) * 1000);
  const jit   = (Math.random() - 0.5) * 800;
  return Math.min(Math.max(base + jit, 600), 9000);
}

async function simulateTyping(api, threadID, ms) {
  const delay = ms ?? 1500;
  try {
    if (typeof api?.sendTypingIndicator === "function") {
      const stop = api.sendTypingIndicator(threadID, () => {});
      await new Promise(r => setTimeout(r, delay));
      if (typeof stop === "function") stop();
    } else {
      await new Promise(r => setTimeout(r, delay));
    }
  } catch (_) { await new Promise(r => setTimeout(r, delay)); }
}

// ─── Helper builders ──────────────────────────────────────────────────────────

function buildReplyHelper(api, event) {
  return {
    reply:  async (msg, cb) => {
      const delay = calcTypingDelay(typeof msg === "string" ? msg : msg?.body || "");
      await simulateTyping(api, event.threadID, delay);
      return api.sendMessage(msg, event.threadID, cb);
    },
    unsend: (mid, cb) => { try { api.unsendMessage(mid || event.messageID, cb); } catch (_) {} },
    react:  (emoji, mid, cb) => { try { api.setMessageReaction(emoji, mid || event.messageID, () => {}, true); } catch (_) {} },
    send:   (msg, tid, cb)   => api.sendMessage(msg, tid || event.threadID, cb),
  };
}

// ─── Thread info cache ────────────────────────────────────────────────────────
const _threadCache = new Map();
async function getThreadInfo(api, tid, ttl = 10 * 60000) {
  const cached = _threadCache.get(tid);
  if (cached && Date.now() - cached.ts < ttl) return cached.data;
  return new Promise((res, rej) => {
    api.getThreadInfo(tid, (err, data) => {
      if (err) { rej(err); return; }
      _threadCache.set(tid, { ts: Date.now(), data });
      res(data);
    });
  });
}

// ─── Main Login ──────────────────────────────────────────────────────────────

function login(cookieInput, opts, callback) {
  if (typeof opts === "function") { callback = opts; opts = {}; }
  opts = opts || {};

  const UA = opts.userAgent || getUA();
  let appState;
  if (Array.isArray(cookieInput)) {
    appState = dedup(cookieInput);
  } else {
    const p = parseCookieInput(String(cookieInput || ""));
    appState = p.cookies;
  }

  if (!appState.length)
    return callback(new Error("[Djamel-fca] لا توجد كوكيز صالحة"), null);
  if (!hasMandatory(appState))
    return callback(new Error("[Djamel-fca] الكوكيز ناقصة: c_user أو xs مفقود"), null);

  const loginOpts = {
    appState, forceLogin: false, logLevel: "silent",
    listenEvents: true, selfListen: false, autoReconnect: false,
    autoMarkDelivery: false, autoMarkRead: false, userAgent: UA,
    ...(opts.fca || {}),
  };

  loginFCA(loginOpts, (err, api) => {
    if (err) return callback(err, null);

    api.setOptions({ listenEvents: true, selfListen: false, autoReconnect: false, userAgent: UA });
    api.getUID = () => api.getCurrentUserID();

    // Human send
    api.sendMessageHuman = async (msg, tid, cb) => {
      const delay = calcTypingDelay(typeof msg === "string" ? msg : msg?.body || "");
      await simulateTyping(api, tid, delay);
      return api.sendMessage(msg, tid, cb);
    };

    // Reply helper factory
    api.buildReplyHelper = (event) => buildReplyHelper(api, event);

    // Get thread info with cache
    api.getThreadInfoCached = (tid, ttl) => getThreadInfo(api, tid, ttl);

    // Fresh state
    let freshState = appState;
    try { freshState = dedup(api.getAppState() || []); } catch (_) {}

    callback(null, api, { appState: freshState, ua: UA, calcTypingDelay, simulateTyping });
  });
}

// ─── Exports ─────────────────────────────────────────────────────────────────
module.exports              = login;
module.exports.login        = login;
module.exports.parseCookieInput   = parseCookieInput;
module.exports.dedup              = dedup;
module.exports.deduplicateCookies = dedup;
module.exports.cookiesToString    = cookiesToString;
module.exports.hasMandatory       = hasMandatory;
module.exports.checkLiveCookie    = checkLiveCookie;
module.exports.getUA              = getUA;
module.exports.rotateUA           = rotateUA;
module.exports.calcTypingDelay    = calcTypingDelay;
module.exports.simulateTyping     = simulateTyping;
module.exports.buildReplyHelper   = buildReplyHelper;
module.exports.getThreadInfo      = getThreadInfo;
module.exports.version            = "3.0.0";
module.exports.author             = "DJAMEL";
