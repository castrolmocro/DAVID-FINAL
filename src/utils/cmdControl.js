/**
 * DAVID V1 — Command Control (per-thread enable/disable)
 * Copyright © 2025 DJAMEL
 */
"use strict";

const fs   = require("fs-extra");
const path = require("path");

const CTRL_PATH = path.join(process.cwd(), "data", "cmdControl.json");

function loadCtrl() {
  try {
    if (!fs.existsSync(CTRL_PATH)) return {};
    return JSON.parse(fs.readFileSync(CTRL_PATH, "utf8")) || {};
  } catch (_) { return {}; }
}

function saveCtrl(data) {
  try {
    fs.ensureDirSync(path.dirname(CTRL_PATH));
    fs.writeFileSync(CTRL_PATH, JSON.stringify(data, null, 2));
  } catch (_) {}
}

let _ctrl = loadCtrl();

function reload() { _ctrl = loadCtrl(); }

/**
 * mode: "blacklist" (default) — all enabled except listed
 *        "whitelist"           — only listed are enabled
 * commands: array of command names
 */
function getThreadConfig(tid) {
  return _ctrl[String(tid)] || { mode: "blacklist", commands: [] };
}

function setThreadConfig(tid, config) {
  _ctrl[String(tid)] = config;
  saveCtrl(_ctrl);
}

function resetThread(tid) {
  delete _ctrl[String(tid)];
  saveCtrl(_ctrl);
}

function isEnabled(tid, cmdName) {
  const cfg = getThreadConfig(tid);
  const inList = (cfg.commands || []).map(String).includes(String(cmdName).toLowerCase());
  if (cfg.mode === "whitelist") return inList;
  return !inList; // blacklist default
}

function getAllThreads() {
  return Object.keys(_ctrl);
}

function getAll() {
  return { ..._ctrl };
}

module.exports = { isEnabled, getThreadConfig, setThreadConfig, resetThread, getAllThreads, getAll, reload };
