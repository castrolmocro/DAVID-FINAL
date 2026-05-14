/**
 * DAVID V1 — /nick — تغيير كنية جميع الأعضاء باستمرار
 * Copyright © 2025 DJAMEL
 * v4: لا تتوقف بسبب الأخطاء، تدعم التغيير أثناء العمل، auto-restart
 */
"use strict";

if (!global._nickRunning) global._nickRunning = {};
if (!global._nickVersion) global._nickVersion = {};
if (!global._nickStop)    global._nickStop    = {};

function isAdmin(id) { return (global.GoatBot?.config?.adminBot||[]).map(String).includes(String(id)); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function sleepInterruptible(ms, tid, ver) {
  const step = 200; let elapsed = 0;
  while (elapsed < ms) {
    if (global._nickStop[tid]) return "stop";
    if ((global._nickVersion[tid]||0) !== ver) return "version";
    await sleep(Math.min(step, ms - elapsed)); elapsed += step;
  }
  return "done";
}

async function runCycle(api, tid, name) {
  if (global._nickRunning[tid]) return;
  global._nickRunning[tid] = true;
  const myVer = global._nickVersion[tid] || 0;

  while (true) {
    if (global._nickStop[tid]) break;
    if ((global._nickVersion[tid]||0) !== myVer) break;

    let members = [];
    try {
      const info = await new Promise((res,rej) => api.getThreadInfo(tid,(e,d)=>e?rej(e):res(d)));
      members = (info?.participantIDs || []).filter(id => String(id) !== String(global.GoatBot?.botID));
    } catch(_) { await sleep(5000); continue; }

    for (const uid of members) {
      if (global._nickStop[tid] || (global._nickVersion[tid]||0) !== myVer) break;
      try { await api.changeNickname(name, tid, uid); } catch(_) {}
      const r = await sleepInterruptible(1800 + Math.random()*1200, tid, myVer);
      if (r !== "done") break;
    }

    const r2 = await sleepInterruptible(8000 + Math.random()*4000, tid, myVer);
    if (r2 !== "done") break;
  }

  global._nickRunning[tid] = false;
  delete global._nickStop[tid];

  // auto-restart إذا ما زال مفعلاً
  if ((global._nickVersion[tid]||0) === myVer + 1) {
    const newName = global._nickCurrentName?.[tid];
    if (newName) setTimeout(() => runCycle(api, tid, newName), 1000);
  }
}

if (!global._nickCurrentName) global._nickCurrentName = {};

module.exports = {
  config: {
    name: "nick", aliases: ["كنيات","nickname"], version: "4.0", author: "DJAMEL",
    countDown: 3, role: 2, category: "management",
    description: "تغيير كنية جميع الأعضاء باستمرار",
    guide: { en: "{pn} [اسم] — تفعيل\n{pn} off — إيقاف\n{pn} status — الحالة\n{pn} حدف — حذف كل الكنيات" }
  },

  onStart: async function({ api, event, args, message }) {
    const tid = event.threadID;
    if (!isAdmin(event.senderID)) return message.reply("⛔ للأدمن فقط.");
    const sub = args[0]?.toLowerCase();

    if (sub === "off" || sub === "إيقاف") {
      global._nickStop[tid] = true;
      global._nickRunning[tid] = false;
      delete global._nickCurrentName[tid];
      return message.reply("✅ تم إيقاف Nick.");
    }

    if (sub === "status" || sub === "حالة") {
      if (global._nickRunning[tid])
        return message.reply(`✅ Nick نشط\n📝 الاسم: ${global._nickCurrentName[tid] || "؟"}`);
      return message.reply("💤 Nick غير نشط.");
    }

    if (sub === "حدف" || sub === "reset") {
      message.reply("🗑 جاري حذف كل الكنيات…");
      try {
        const info = await new Promise((res,rej) => api.getThreadInfo(tid,(e,d)=>e?rej(e):res(d)));
        const members = (info?.participantIDs||[]).filter(id => String(id) !== String(global.GoatBot?.botID));
        for (const uid of members) { try { await api.changeNickname("", tid, uid); } catch(_) {} await sleep(500); }
        return message.reply("✅ تم حذف جميع الكنيات.");
      } catch(e) { return message.reply("❌ خطأ: " + e.message); }
    }

    const name = args.join(" ").trim();
    if (!name) return message.reply("❌ اكتب الاسم المراد تعيينه.\nمثال: /nick DJAMEL");

    // إذا كانت تعمل بالفعل، غيّر الإصدار فقط (تحديث فوري)
    if (global._nickRunning[tid]) {
      global._nickCurrentName[tid] = name;
      global._nickVersion[tid] = (global._nickVersion[tid] || 0) + 1;
      return message.reply(`✅ تم تحديث الاسم إلى: ${name}`);
    }

    global._nickStop[tid]        = false;
    global._nickCurrentName[tid] = name;
    global._nickVersion[tid]     = (global._nickVersion[tid] || 0) + 1;
    message.reply(`✅ تم تفعيل Nick\n📝 الاسم: ${name}`);
    runCycle(api, tid, name).catch(() => {});
  }
};
