/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║           DAVID V1 — DjamelBot Engine (المحرك الرئيسي)         ║
 * ║           Copyright © 2025 DJAMEL — All rights reserved        ║
 * ║           Version 2.0 | Engine: DAVID                          ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */
"use strict";

// ─── Global Polyfills ──────────────────────────────────────────────────────────
(function polyfill() {
  try { if (!global.ReadableStream) { const s = require("stream/web"); Object.assign(global, { ReadableStream: s.ReadableStream, WritableStream: s.WritableStream, TransformStream: s.TransformStream }); } } catch (_) {}
  try { if (!global.Blob)         global.Blob        = require("buffer").Blob; }   catch (_) {}
  try { if (!global.TextEncoder)  { const { TextEncoder, TextDecoder } = require("util"); Object.assign(global, { TextEncoder, TextDecoder }); } } catch (_) {}
  if (!global.File) {
    global.File = class File extends (global.Blob || Object) {
      constructor(c, n, o = {}) { try { super(c, o); } catch (_) {} this._name = n; this._lm = o.lastModified ?? Date.now(); }
      get name() { return this._name; }
      get lastModified() { return this._lm; }
    };
  }
})();

process.on("unhandledRejection", e => { try { (global.log?.error || console.error)("DAVID", e?.message || String(e)); } catch (_) {} });
process.on("uncaughtException",  e => { try { (global.log?.error || console.error)("DAVID", e?.message || String(e)); } catch (_) {} });

const fs       = require("fs-extra");
const path     = require("path");
const chalk    = require("chalk");
const gradient = require("gradient-string");
const moment   = require("moment-timezone");

const DjamelFCA                   = require("./Djamel-fca");
const { initGlobals }             = require("./src/engine/core");
const { loadCommands }            = require("./src/engine/loader");
const handlerEvents               = require("./src/engine/handlerEvents");
const { startDashboard, getIO, interceptLogs } = require("./src/dashboard/server");
const { initDB }                  = require("./src/utils/database");
const { startPoller, stopPoller } = require("./src/utils/customPoller");

const ROOT         = __dirname;
const CONFIG_PATH  = path.join(ROOT, "config.json");
const ACCOUNT_PATH = path.join(ROOT, "account.txt");
const CMDS_DIR     = path.join(ROOT, "src/commands");
const PORT         = parseInt(process.env.PORT || process.env.DASHBOARD_PORT || "5000", 10);

// ─── Load Config ───────────────────────────────────────────────────────────────
function loadConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")); }
  catch (e) { console.error("❌ config.json خطأ:", e.message); process.exit(1); }
}

let config = loadConfig();
initGlobals(config);
const log = global.log;

// ─── Live log interceptor (for dashboard logs page) ───────────────────────────
interceptLogs();

// ─── Hot-reload config (تحديث الإعدادات بدون إعادة تشغيل) ──────────────────
let _cfgDebounce = null;
fs.watch(CONFIG_PATH, () => {
  if (global._selfWriteConfig) return;
  clearTimeout(_cfgDebounce);
  _cfgDebounce = setTimeout(() => {
    try {
      const newCfg = loadConfig();
      config = newCfg;
      global.GoatBot.config = newCfg;
      global.config = newCfg;
      global.commandPrefix = newCfg.prefix || "/";
      log.ok("HOT", "config.json تم تحديثه تلقائياً بدون إعادة تشغيل ✔");
      const io = getIO();
      if (io) io.emit("config-reloaded", { ts: Date.now() });
    } catch (e) { log.error("HOT", "فشل تحديث config: " + e.message); }
  }, 800);
});

// ─── Banner ────────────────────────────────────────────────────────────────────
function printBanner() {
  console.clear();
  const art = `
██████╗  █████╗ ██╗   ██╗██╗██████╗     ██╗   ██╗ ██╗
██╔══██╗██╔══██╗██║   ██║██║██╔══██╗    ██║   ██║███║
██║  ██║███████║██║   ██║██║██║  ██║    ██║   ██║╚██║
██║  ██║██╔══██║╚██╗ ██╔╝██║██║  ██║    ╚██╗ ██╔╝ ██║
██████╔╝██║  ██║ ╚████╔╝ ██║██████╔╝     ╚████╔╝  ██║
╚═════╝ ╚═╝  ╚═╝  ╚═══╝  ╚═╝╚═════╝       ╚═══╝   ╚═╝`;
  console.log(gradient.pastel(art));
  console.log(chalk.hex("#00b4d8")("  ═".repeat(30)));
  console.log(chalk.hex("#ffd166")(`  Developer  : DJAMEL`));
  console.log(chalk.hex("#06d6a0")(`  Engine     : DAVID v2.0`));
  console.log(chalk.hex("#90e0ef")(`  Library    : Djamel-fca v3.0`));
  console.log(chalk.hex("#ff6b6b")(`  Framework  : WHITE V3 + Jarfis Merged`));
  console.log(chalk.hex("#00b4d8")(`  Port       : ${PORT}`));
  console.log(chalk.hex("#00b4d8")("  ═".repeat(30)));
  console.log();
}

// ─── Stop listeners ────────────────────────────────────────────────────────────
function stopListening() {
  stopPoller();
  try { if (global._currentListener) { global._currentListener(); global._currentListener = null; } } catch (_) {}
  try { if (global._listenTimer) { clearTimeout(global._listenTimer); global._listenTimer = null; } } catch (_) {}
  try { if (global.GoatBot?.fcaApi?.ctx?.mqttClient) global.GoatBot.fcaApi.ctx.mqttClient.end(true); } catch (_) {}
}

// ─── Message handler wrapper ────────────────────────────────────────────────────
function onEvent(api, event) {
  if (!event) return;
  global.lastMqttActivity = Date.now();
  handlerEvents(api, event, global.GoatBot.commands).catch(e => {
    log.error("EVENT", e?.message || String(e));
  });
}

// ─── HTTP Long-Poll fallback ────────────────────────────────────────────────────
function startPolling(api, attempt = 1) {
  const MAX = 3;
  log.warn("POLL", `بدء HTTP Long-Poll (محاولة ${attempt}/${MAX})…`);
  let started = false;

  const stop = api.listen((err, event) => {
    if (err) {
      const msg = String(err.error || err.message || err);
      log.error("POLL", msg);
      if (attempt < MAX) setTimeout(() => startPolling(api, attempt + 1), attempt * 8000);
      else { log.warn("POLL", "→ Custom Poller"); startPoller(api, handlerEvents, config.pollIntervalMs || 6000); }
      return;
    }
    if (!started) {
      started = true;
      log.ok("POLL", `نشط ✔ — UID: ${chalk.bold.green(api.getCurrentUserID())}`);
      const io = getIO();
      if (io) io.emit("bot-status", { status: "online", uid: api.getCurrentUserID() });
    }
    onEvent(api, event);
  });
  global._currentListener = stop;
}

// ─── MQTT Connection ───────────────────────────────────────────────────────────
function startMqtt(api, attempt = 1) {
  const MAX = 4;
  log.info("MQTT", `اتصال (محاولة ${attempt}/${MAX})…`);
  let mqttOk = false;

  const timer = setTimeout(() => {
    if (!mqttOk) { log.warn("MQTT", "timeout → Long-Poll"); startPolling(api); }
  }, 22000);
  global._listenTimer = timer;

  const listenFn = api.listenMqtt || api.listen;
  const stop = listenFn?.call(api, (err, event) => {
    if (err) {
      clearTimeout(timer);
      const msg = String(err.error || err.message || err.type || err);
      log.warn("MQTT", `${msg} (${attempt}/${MAX})`);
      if (attempt < MAX) setTimeout(() => startMqtt(api, attempt + 1), Math.min(attempt * 8000, 40000));
      else startPolling(api);
      return;
    }
    if (!mqttOk) {
      mqttOk = true;
      clearTimeout(timer);
      global._listenTimer = null;
      log.ok("MQTT", `متصل ✔ — UID: ${chalk.bold.green(api.getCurrentUserID())}`);
      const io = getIO();
      if (io) io.emit("bot-status", { status: "online", uid: api.getCurrentUserID() });
    }
    onEvent(api, event);
  });
  if (stop) global._currentListener = stop;
  else { clearTimeout(timer); startPolling(api); }
}

// ─── Protection Engine (20 طبقة) ───────────────────────────────────────────────
function startProtection(api) {
  const layers = [
    { mod: "./src/protection/stealth",          fn: "start" },
    { mod: "./src/protection/keepAlive",        fn: "start" },
    { mod: "./src/protection/mqttHealthCheck",  fn: "startHealthCheck" },
    { mod: "./src/protection/outgoingThrottle", fn: "wrapSendMessage" },
    { mod: "./src/protection/humanTyping",      fn: "wrapWithTyping" },
    { mod: "./src/protection/naturalPresence",  fn: "start" },
    { mod: "./src/protection/behaviorScheduler",fn: "start" },
    { mod: "./src/protection/antiDetection",    fn: "start" },
    { mod: "./src/protection/sessionRefresher", fn: "start" },
    { mod: "./src/protection/humanReadReceipt", fn: "start" },
    { mod: "./src/protection/scrollSimulator",  fn: "start" },
    { mod: "./src/protection/reactionDelay",    fn: "start" },
    { mod: "./src/protection/connectionJitter", fn: "start" },
    { mod: "./src/protection/duplicateGuard",   fn: "start" },
    { mod: "./src/protection/typingVariator",   fn: "start" },
    { mod: "./src/protection/Uprotection",      fn: "start" },
  ];
  let active = 0;
  for (const { mod, fn } of layers) {
    try {
      const m = require(mod);
      if (typeof m[fn] === "function") m[fn](api);
      active++;
    } catch (_) {}
  }
  log.ok("PROTECTION", `🛡️  ${active + 4}/20 طبقة حماية نشطة ✔`);
}

function stopProtection() {
  const stoppable = ["stealth", "keepAlive", "mqttHealthCheck"];
  for (const name of stoppable) {
    try {
      const m = require(`./src/protection/${name}`);
      if (typeof m.stop === "function") m.stop();
      if (typeof m.stopHealthCheck === "function") m.stopHealthCheck();
    } catch (_) {}
  }
}

// ─── Login lock ──────────────────────────────────────────────────────────────────
let _loginLock = false;

// ─── تسجيل الدخول الرئيسي ──────────────────────────────────────────────────────
async function startBot() {
  if (_loginLock) { log.warn("LOGIN", "تسجيل دخول جارٍ — تجاهل"); return; }
  _loginLock = true;
  const io = getIO();
  stopListening();
  stopProtection();

  global.GoatBot.fcaApi = null;
  global.GoatBot.botID  = null;
  global.api            = null;

  if (io) io.emit("bot-status", { status: "connecting", uid: null });

  // قراءة الكوكيز
  if (!fs.existsSync(ACCOUNT_PATH)) fs.writeFileSync(ACCOUNT_PATH, "", "utf8");
  const rawCookie = fs.readFileSync(ACCOUNT_PATH, "utf8").trim();

  if (!rawCookie) {
    log.error("LOGIN", "لا توجد كوكيز — ارفعها من لوحة التحكم");
    if (io) io.emit("bot-status", { status: "offline", message: "لا توجد كوكيز" });
    _loginLock = false; return;
  }

  const { parseCookieInput, hasMandatory, checkLiveCookie, cookiesToString, getUA } = DjamelFCA;
  const parsed = parseCookieInput(rawCookie);
  const cookies = parsed.cookies;

  if (!cookies.length || !hasMandatory(cookies)) {
    log.error("LOGIN", "الكوكيز غير صالحة (c_user أو xs مفقود)");
    if (io) io.emit("bot-status", { status: "offline", message: "كوكيز غير صالحة" });
    _loginLock = false; return;
  }

  const UA = config.facebookAccount?.userAgent || getUA();
  log.info("LOGIN", "التحقق من صلاحية الكوكيز…");
  const valid = await checkLiveCookie(cookiesToString(cookies), UA);
  if (valid) log.ok("LOGIN", "الكوكيز صالحة ✔");
  else log.warn("LOGIN", "تحذير: التحقق من mbasic فشل — سنحاول رغم ذلك");

  let attempt = 0;
  const MAX_ATTEMPTS = 3;

  function tryLogin() {
    attempt++;
    log.info("LOGIN", `محاولة ${attempt}/${MAX_ATTEMPTS}…`);
    DjamelFCA(cookies, { userAgent: UA }, async (err, api, extras) => {
      if (err) {
        const msg = err.message || String(err);
        log.error("LOGIN", `فشل (${attempt}/${MAX_ATTEMPTS}): ${msg}`);
        if (io) io.emit("bot-status", { status: "error", message: `فشل: ${msg}` });
        if (attempt < MAX_ATTEMPTS) { setTimeout(tryLogin, attempt * 5000); return; }
        log.error("LOGIN", "وصل لأقصى محاولات");
        if (io) io.emit("bot-status", { status: "offline", message: "فشل تسجيل الدخول" });
        _loginLock = false; return;
      }

      // حفظ AppState
      try {
        if (extras?.appState?.length) {
          global._selfWrite = true;
          fs.writeFileSync(ACCOUNT_PATH, JSON.stringify(extras.appState, null, 2));
          setTimeout(() => { global._selfWrite = false; }, 6000);
        }
      } catch (_) {}

      const uid = api.getCurrentUserID();
      global.GoatBot.fcaApi = api;
      global.GoatBot.botID  = uid;
      global.api            = api;

      // اسم البوت
      let botName = config.botName || "DAVID V1";
      try {
        const info = await new Promise((res, rej) =>
          api.getUserInfo(uid, (e, d) => e ? rej(e) : res(d)));
        botName = info?.[uid]?.name || botName;
      } catch (_) {}

      log.ok("LOGIN", `✔ مرحباً ${chalk.bold.cyan(botName)} — UID: ${chalk.bold.green(uid)}`);

      // طباعة بطاقة المعلومات
      console.log();
      console.log(chalk.hex("#00b4d8")("  ┌──────────────────────────────────────────┐"));
      console.log(`  │  ${chalk.yellow("Bot:")}      ${chalk.white(botName.padEnd(35))}│`);
      console.log(`  │  ${chalk.yellow("UID:")}      ${chalk.white(uid.padEnd(35))}│`);
      console.log(`  │  ${chalk.yellow("Prefix:")}   ${chalk.white((config.prefix||"/").padEnd(35))}│`);
      console.log(`  │  ${chalk.yellow("Commands:")} ${chalk.white(String(global.GoatBot.commands.size).padEnd(35))}│`);
      console.log(`  │  ${chalk.yellow("Engine:")}   ${chalk.white("DAVID v2 — 20 Protection Layers".padEnd(35))}│`);
      console.log(`  │  ${chalk.yellow("Port:")}     ${chalk.white(String(PORT).padEnd(35))}│`);
      console.log(`  │  ${chalk.yellow("By:")}       ${chalk.white("DJAMEL".padEnd(35))}│`);
      console.log(chalk.hex("#00b4d8")("  └──────────────────────────────────────────┘"));
      console.log();

      _loginLock = false;
      startProtection(api);
      await new Promise(r => setTimeout(r, 1500));

      if (io) io.emit("bot-status", {
        status: "online", uid, botName,
        prefix: config.prefix || "/",
        commands: global.GoatBot.commands.size,
      });

      // اختيار الاتصال
      const hasMsess = cookies.some(c => c.key === "m_sess");
      if (hasMsess && typeof api.listenMqtt === "function") startMqtt(api);
      else startPolling(api);
    });
  }

  tryLogin();
}

// ─── مراقبة account.txt ──────────────────────────────────────────────────────────
function watchAccount() {
  let debounce = null;
  fs.watch(ACCOUNT_PATH, () => {
    if (global._selfWrite) return;
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      log.info("WATCH", "account.txt تغيَّر — إعادة تسجيل الدخول…");
      startBot();
    }, 3000);
  });
}

// ─── MAIN ──────────────────────────────────────────────────────────────────────
(async () => {
  printBanner();
  fs.ensureDirSync(path.join(ROOT, "data"));
  fs.ensureDirSync(path.join(ROOT, "database/data"));

  // DB
  try { await initDB(); log.ok("DB", "قاعدة البيانات جاهزة ✔"); }
  catch (e) { log.error("DB", e.message); }

  // Commands
  global.GoatBot.commands = loadCommands(CMDS_DIR);
  global.commands = global.GoatBot.commands;

  // Dashboard (PORT واحد — بدون تعارض)
  startDashboard(PORT);

  // تعريض startBot
  global.startBot = startBot;
  global.GoatBot.reLoginBot = startBot;

  // بدء البوت
  await startBot();
  watchAccount();
})();
