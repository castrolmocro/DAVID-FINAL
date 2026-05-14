/**
 * DAVID V1 — Logger
 * Copyright © 2025 DJAMEL
 */
"use strict";
const chalk  = require("chalk");
let _moment  = null;
function getMoment() { if (!_moment) { try { _moment = require("moment-timezone"); } catch(_) {} } return _moment; }
const ts = () => {
  const m = getMoment();
  if (m) { try { return m().tz(global.GoatBot?.config?.timezone||"Africa/Algiers").format("HH:mm:ss"); } catch(_) {} }
  return new Date().toTimeString().slice(0,8);
};
function fmt(icon, color, label, msg) {
  const t = chalk.gray(ts());
  const l = color(`[${label}]`);
  const m = typeof msg === "object" ? JSON.stringify(msg) : String(msg ?? "");
  return `${t} ${icon} ${l} ${m}`;
}
const log = {
  info:    (l,m) => console.log(fmt("•", chalk.cyan,       l, m)),
  ok:      (l,m) => console.log(fmt("✔", chalk.green,      l, m)),
  warn:    (l,m) => console.log(fmt("⚠", chalk.yellow,     l, m)),
  error:   (l,m) => console.log(fmt("✘", chalk.red,        l, m)),
  err:     (l,m) => console.log(fmt("✘", chalk.red,        l, m)),
  success: (l,m) => console.log(fmt("★", chalk.bold.green, l, m)),
  master:  (l,m) => console.log(fmt("👑",chalk.magenta,    l, m)),
};
module.exports = log;
