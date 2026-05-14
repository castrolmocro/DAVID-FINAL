/**
 * DAVID V1 — /chats — إدارة المحادثات والغروبات
 * Copyright © 2025 DJAMEL
 */
"use strict";
const fs   = require("fs-extra");
const path = require("path");
const DM_DATA = path.join(process.cwd(), "database/data/dmLock.json");

function isAdmin(id) { return (global.GoatBot?.config?.adminBot||[]).map(String).includes(String(id)); }
function getDmLocked() {
  if (global.GoatBot.dmLocked !== undefined) return !!global.GoatBot.dmLocked;
  try { if(fs.existsSync(DM_DATA)) { const d=JSON.parse(fs.readFileSync(DM_DATA,"utf8")); global.GoatBot.dmLocked=!!d.locked; return global.GoatBot.dmLocked; } } catch(_) {}
  return false;
}
function setDmLocked(v) {
  global.GoatBot.dmLocked = !!v;
  try { fs.ensureDirSync(path.dirname(DM_DATA)); fs.writeFileSync(DM_DATA,JSON.stringify({locked:!!v},null,2)); } catch(_) {}
}

module.exports = {
  config: {
    name: "chats", aliases: ["محادثات","chat"], version: "2.0", author: "DJAMEL",
    countDown: 3, role: 2, category: "management",
    description: "إدارة المحادثات والغروبات",
    guide: { en: "{pn} list — قائمة الغروبات\n{pn} dm on/off — قفل/فك DM\n{pn} angel — حالة Angel\n{pn} count" }
  },

  onStart: async function({ api, event, args, message }) {
    if (!isAdmin(event.senderID)) return message.reply("⛔ للأدمن فقط.");
    const sub = args[0]?.toLowerCase();

    if (!sub || sub === "count") {
      try {
        const threads = await new Promise((res,rej) => api.getThreadList(15,null,["INBOX"],(e,d)=>e?rej(e):res(d)));
        const groups = (threads||[]).filter(t => t.isGroup);
        const dms    = (threads||[]).filter(t => !t.isGroup);
        let msg = `📊 إحصائيات المحادثات\n`;
        msg += `━━━━━━━━━━━━━━━━━\n`;
        msg += `👥 غروبات: ${groups.length}\n`;
        msg += `💬 محادثات خاصة: ${dms.length}\n`;
        msg += `🔒 DM Lock: ${getDmLocked() ? "مفعل" : "معطل"}\n`;
        msg += `🤖 Angel: ${Object.keys(global.GoatBot.angelIntervals||{}).length} غروب نشط`;
        return message.reply(msg);
      } catch(e) { return message.reply("❌ " + e.message); }
    }

    if (sub === "list") {
      try {
        const threads = await new Promise((res,rej) => api.getThreadList(20,null,["INBOX"],(e,d)=>e?rej(e):res(d)));
        const groups = (threads||[]).filter(t => t.isGroup).slice(0, 10);
        if (!groups.length) return message.reply("لا توجد غروبات.");
        let msg = "📋 قائمة الغروبات:\n━━━━━━━━━━━━━━━━━\n";
        groups.forEach((g,i) => { msg += `${i+1}. ${g.name||"بلا اسم"}\n   ID: ${g.threadID}\n`; });
        return message.reply(msg);
      } catch(e) { return message.reply("❌ " + e.message); }
    }

    if (sub === "dm") {
      const action = args[1]?.toLowerCase();
      if (action === "on")  { setDmLocked(true);  return message.reply("✅ تم تفعيل DM Lock — البوت لن يرد على الرسائل الخاصة."); }
      if (action === "off") { setDmLocked(false); return message.reply("✅ تم إلغاء DM Lock."); }
      return message.reply(`🔒 DM Lock: ${getDmLocked() ? "مفعل" : "معطل"}\nاستخدم: /chats dm on/off`);
    }

    if (sub === "angel") {
      const active = Object.keys(global.GoatBot.angelIntervals||{});
      if (!active.length) return message.reply("💤 Angel غير مفعل في أي غروب.");
      return message.reply(`🔔 Angel نشط في ${active.length} غروب:\n${active.map((t,i)=>`${i+1}. ${t}`).join("\n")}`);
    }

    message.reply("📌 الأوامر المتاحة:\n/chats count\n/chats list\n/chats dm on/off\n/chats angel");
  }
};
