/**
 * DAVID V1 — Uprotection Protection Layer
 * Copyright © 2025 DJAMEL
 * Non-blocking stub — always safe, never crashes
 */
"use strict";
let _active = false, _api = null;
function start(api)         { try { _active = true; _api = api; } catch(_) {} }
function stop()             { try { _active = false; _api = null; } catch(_) {} }
function wrapSendMessage(a) { try { start(a); } catch(_) {} }
function wrapWithTyping(a)  { try { start(a); } catch(_) {} }
module.exports = { start, stop, wrapSendMessage, wrapWithTyping, isActive: () => _active };
