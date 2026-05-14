/**
 * DAVID V1 — /divel — رسائل دورية للغروب مع انتظار عشوائي
 * Copyright © 2025 DJAMEL
 */
"use strict";
const fs   = require("fs-extra");
const path = require("path");
const DATA = path.join(process.cwd(), "database/data/divelData.json");

function load() { try { if(fs.existsSync(DATA)) return JSON.parse(fs.readFileSync(DATA,"utf8")); } catch(_){} return {}; }
function save(d) { fs.ensureDirSync(path.dirname(DATA)); fs.writeFileSync(DATA,JSON.stringify(d,null,2)); }
function isAdmin(id) { return (global.GoatBot?.config?.adminBot||[]).map(String).includes(String(id)); }

if (!global.GoatBot.divelWatchers) global.GoatBot.divelWatchers = {};

async function humanSend(api, tid, msg) {
  const delay = global.utils?.calcHumanTypingDelay?.(msg) || 1500;
  await global.utils?.simulateTyping?.(api, tid, delay);
  await api.sendMessage({ body: msg, isDaydreamMode: true }, tid);
}

function scheduleNext(api, tid, td) {
  if (global.GoatBot.divelWatchers[tid]?.timer)
    clearTimeout(global.GoatBot.divelWatchers[tid].timer);
  if (!td?.active || !td?.message) return;
  const minS = td.minSeconds ?? 300;
  const maxS = td.maxSeconds ?? minS;
  const ms   = Math.round((minS + Math.random()*(maxS-minS)) * 1000);
  const timer = setTimeout(async () => {
    try { await humanSend(api, tid, td.message); } catch(_) {}
    const d = load(); if (d[tid]?.active) scheduleNext(api, tid, d[tid]);
  }, ms);
  global.GoatBot.divelWatchers[tid] = { ...td, timer };
}

function restoreAll(api) {
  if (global.GoatBot._divelRestored) return;
  global.GoatBot._divelRestored = true;
  const data = load();
  for (const [tid, td] of Object.entries(data))
    if (td.active && td.message) scheduleNext(api, tid, td);
}

module.exports = {
  config: {
    name: "divel", aliases: ["dv"], version: "2.0", author: "DJAMEL",
    countDown: 3, role: 2, category: "management",
    description: "رسائل دورية للغروب مع انتظار عشوائي",
    guide: { en: "{pn} [رسالة] [min-max ثانية]\n{pn} off\n{pn} status" }
  },

  onStart: async function({ api, event, args, message }) {
    const tid = event.threadID;
    if (!isAdmin(event.senderID)) return message.reply("⛔ للأدمن فقط.");
    restoreAll(api);
    const data = load();
    const sub  = args[0]?.toLowerCase();

    if (!sub || sub === "status") {
      const td = data[tid];
      if (!td?.active) return message.reply("💤 Divel غير مفعل.");
      return message.reply(`✅ Divel نشط\n📝 "${td.message}"\n⏱ ${td.minSeconds}–${td.maxSeconds}s`);
    }

    if (sub === "off") {
      if (global.GoatBot.divelWatchers[tid]?.timer)
        clearTimeout(global.GoatBot.divelWatchers[tid].timer);
      delete global.GoatBot.divelWatchers[tid];
      if (data[tid]) { data[tid].active = false; save(data); }
      return message.reply("✅ تم إيقاف Divel.");
    }

    const nums  = args.filter(a => /^\d+$/.test(a));
    const text  = args.filter(a => !/^\d+$/.test(a)).join(" ").trim() || data[tid]?.message || "👋";
    const minS  = parseInt(nums[0]) || 300;
    const maxS  = Math.max(parseInt(nums[1]) || minS, minS);

    data[tid] = { active: true, message: text, minSeconds: minS, maxSeconds: maxS };
    save(data);
    scheduleNext(api, tid, data[tid]);
    message.reply(`✅ Divel مفعل\n📝 "${text}"\n⏱ ${minS}–${maxS}s`);
  }
};
