/**
 * DAVID V1 — Stealth Engine (10 تمويه طبقة)
 * Copyright © 2025 DJAMEL
 * Non-blocking: لا يسبب انهيار البوت أبداً
 */
"use strict";
const axios = require("axios");
const UA_POOL = [
  "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 Chrome/112.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 Version/16.5 Mobile Safari/604.1",
  "Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 Chrome/101.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 13; OnePlus 11) AppleWebKit/537.36 Chrome/114.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 11; Redmi Note 8 Pro) AppleWebKit/537.36 Chrome/100.0.4896.127 Mobile Safari/537.36",
];
let _uaIdx = 0, _active = false, _api = null;
const getUA    = () => UA_POOL[_uaIdx];
const rotateUA = () => { _uaIdx = (_uaIdx+1) % UA_POOL.length; return UA_POOL[_uaIdx]; };
const rand     = (a,b) => Math.floor(Math.random()*(b-a+1))+a;
const sleep    = ms => new Promise(r => setTimeout(r, ms));

function isSleepHour() {
  try {
    const cfg = global.GoatBot?.config?.stealth || {};
    const tz  = global.GoatBot?.config?.timezone || "Africa/Algiers";
    const h   = parseInt(new Date().toLocaleString("en-US",{timeZone:tz,hour:"numeric",hour12:false}),10);
    const s   = cfg.sleepHourStart ?? 1, e = cfg.sleepHourEnd ?? 7;
    return s < e ? h >= s && h < e : h >= s || h < e;
  } catch (_) { return false; }
}

async function presenceLoop() {
  while (_active) {
    try {
      if (isSleepHour() || !_api) { await sleep(rand(12,20) * 60000); continue; }
      const state = _api.getAppState?.();
      if (state?.length) {
        const ck = state.map(c => `${c.key}=${c.value}`).join("; ");
        await axios.get("https://www.facebook.com/", {
          headers: { cookie: ck, "user-agent": rotateUA(), "accept": "text/html,*/*;q=0.8",
                     "accept-language": "ar,en-US;q=0.9", "upgrade-insecure-requests": "1" },
          timeout: 12000, validateStatus: null, maxRedirects: 2,
        });
      }
    } catch (_) {}
    await sleep(rand(8,20) * 60000);
  }
}

function start(api) { if (_active) return; _api = api; _active = true; presenceLoop().catch(() => {}); }
function stop()     { _active = false; _api = null; }
module.exports = { start, stop, getUA, rotateUA };
