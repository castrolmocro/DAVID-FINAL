/**
 * DAVID V1 — Custom HTTP Poller (fallback for MQTT)
 * Copyright © 2025 DJAMEL
 */
"use strict";
const axios = require("axios");

let _active = false;
let _timer  = null;

function stopPoller() {
  _active = false;
  if (_timer) { clearTimeout(_timer); _timer = null; }
}

function startPoller(api, handlerFn, intervalMs = 6000) {
  if (_active) return;
  _active = true;
  global.log?.info?.("POLLER", `Custom HTTP Poller — interval ${intervalMs}ms`);

  let lastSeen = "";
  async function poll() {
    if (!_active) return;
    try {
      // graphql thread list as keepalive + event source
      const threads = await new Promise((res, rej) => {
        api.getThreadList(3, null, ["INBOX"], (e, d) => e ? rej(e) : res(d));
      });
      const key = JSON.stringify((threads || []).map(t => t.threadID));
      if (key !== lastSeen) { lastSeen = key; global.lastMqttActivity = Date.now(); }
    } catch (e) {
      global.log?.warn?.("POLLER", e.message);
    }
    _timer = setTimeout(poll, intervalMs);
  }
  poll().catch(() => {});
}

module.exports = { startPoller, stopPoller };
