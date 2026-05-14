/**
 * DAVID V1 — Rate Limit (Layer 7+16+17)
 * Copyright © 2025 DJAMEL
 * صمم ليكون مستقراً 100% — لا يسبب انهيار البوت
 */
"use strict";
const store = new Map();
function check(key, max, windowMs) {
  try {
    const now = Date.now();
    if (!store.has(key)) store.set(key, { e: [], w: false });
    const entry = store.get(key);
    entry.e = entry.e.filter(t => now - t < windowMs);
    entry.e.push(now);
    return { exceeded: entry.e.length > max, count: entry.e.length, warned: entry.w };
  } catch (_) { return { exceeded: false, count: 0, warned: false }; }
}
function setWarned(key) { try { if (store.has(key)) store.get(key).w = true; } catch (_) {} }
function reset(key)     { store.delete(key); }
setInterval(() => { try { const n = Date.now(); for (const [k,v] of store) { v.e = v.e.filter(t => n-t < 300000); if (!v.e.length) store.delete(k); } } catch (_) {} }, 5*60*1000);
module.exports = { check, setWarned, reset };
