/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║         DAVID V1 — Watchdog (مراقب العملية)                    ║
 * ║         Copyright © 2025 DJAMEL — All rights reserved          ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */
"use strict";

const { spawn } = require("child_process");
const path      = require("path");

const MAX_RESTARTS      = 25;
const BASE_DELAY_MS     = 3000;
const MAX_DELAY_MS      = 5 * 60 * 1000;
const BACKOFF_MULT      = 1.8;
const RESET_STABLE_MS   = 10 * 60 * 1000;

let restarts     = 0;
let currentDelay = BASE_DELAY_MS;
let child        = null;
let stableTimer  = null;

const ts = () => new Date().toTimeString().slice(0, 8);
const log = (msg) => console.log(`${ts()} [WATCHDOG] ${msg}`);

function start() {
  if (restarts >= MAX_RESTARTS) {
    log(`وصل لأقصى إعادات التشغيل (${MAX_RESTARTS}). توقف.`);
    process.exit(1);
  }

  restarts++;
  log(`تشغيل DAVID V1... (محاولة ${restarts})`);

  child = spawn(process.execPath, [path.join(__dirname, "David.js")], {
    stdio: "inherit",
    env:   { ...process.env },
  });

  if (stableTimer) clearTimeout(stableTimer);
  stableTimer = setTimeout(() => {
    restarts = 0;
    currentDelay = BASE_DELAY_MS;
    log("البوت مستقر — تم إعادة تعيين العداد");
  }, RESET_STABLE_MS);

  child.on("exit", (code, signal) => {
    if (stableTimer) clearTimeout(stableTimer);
    if (code === 0) {
      log("خروج نظيف — إعادة تشغيل فورية…");
      restarts = 0; currentDelay = BASE_DELAY_MS;
      setTimeout(start, 1000);
      return;
    }
    log(`خرج بكود ${code}/${signal} — إعادة بعد ${Math.round(currentDelay/1000)}s`);
    setTimeout(() => { currentDelay = Math.min(currentDelay * BACKOFF_MULT, MAX_DELAY_MS); start(); }, currentDelay);
  });

  child.on("error", err => {
    log(`خطأ: ${err.message}`);
    setTimeout(start, currentDelay);
  });
}

process.on("SIGINT",  () => { if (child) child.kill("SIGINT");  process.exit(0); });
process.on("SIGTERM", () => { if (child) child.kill("SIGTERM"); process.exit(0); });
process.on("SIGHUP",  () => { if (child) child.kill("SIGTERM"); });

start();
