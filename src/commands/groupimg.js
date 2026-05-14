/**
 * DAVID V1 — /groupimg — قفل صورة الغروب
 * Copyright © 2025 DJAMEL
 */
"use strict";
const axios = require("axios");
const fs    = require("fs-extra");
const path  = require("path");
const os    = require("os");
const CACHE = path.join(os.tmpdir(), "david_groupimg");
fs.ensureDirSync(CACHE);

function lockFile(tid) { return path.join(CACHE, `lock_${tid}.jpg`); }
function isAdmin(id)   { return (global.GoatBot?.config?.adminBot||[]).map(String).includes(String(id)); }
function isGroupAdmin(uid, tid) {
  const list = global.GoatBot?.allThreadData?.[tid]?.adminIDs || [];
  return list.some(a => String(a.id||a) === String(uid));
}

const locks = new Map(); // tid → true/false

module.exports = {
  config: {
    name: "groupimg", aliases: ["gcimg","صورة"], version: "2.0", author: "DJAMEL",
    countDown: 5, role: 2, category: "management",
    description: "تغيير وقفل صورة الغروب",
    guide: { en: "أرسل صورة مع {pn}\n{pn} off — فك القفل\n{pn} status" }
  },

  onStart: async function({ api, event, args, message }) {
    const tid = event.threadID;
    const uid = event.senderID;
    if (!isAdmin(uid) && !isGroupAdmin(uid, tid)) return message.reply("⛔ للأدمن فقط.");
    const sub = args[0]?.toLowerCase();

    if (sub === "off") {
      locks.set(tid, false);
      const lf = lockFile(tid);
      if (fs.existsSync(lf)) fs.removeSync(lf);
      return message.reply("✅ تم فك قفل صورة الغروب.");
    }

    if (sub === "status") {
      const locked = locks.get(tid) && fs.existsSync(lockFile(tid));
      return message.reply(locked ? "🔒 الصورة مقفلة." : "🔓 الصورة غير مقفلة.");
    }

    // الحصول على الصورة من المرفق أو رابط
    let imageUrl = null;
    const attach = event.messageReply?.attachments?.[0] || event.attachments?.[0];
    if (attach?.type === "photo") imageUrl = attach.url || attach.previewUrl;
    if (!imageUrl && args[0]?.startsWith("http")) imageUrl = args[0];

    if (!imageUrl) return message.reply("📸 أرسل صورة مع الأمر أو رابط الصورة.\nمثال: /groupimg [رابط]");

    message.react("⏳", event.messageID);
    try {
      const res = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 15000 });
      const lf  = lockFile(tid);
      fs.writeFileSync(lf, Buffer.from(res.data));
      await api.changeGroupImage(fs.createReadStream(lf), tid);
      locks.set(tid, true);
      message.react("✅", event.messageID);
      message.reply("✅ تم تغيير صورة الغروب وقفلها.\nاستخدم /groupimg off لفك القفل.");
    } catch(e) {
      message.react("❌", event.messageID);
      message.reply("❌ فشل تغيير الصورة: " + e.message);
    }
  },

  // مراقبة تغيير الصورة وإعادة تطبيق القفل
  onEvent: async function({ api, event }) {
    if (event.logMessageType !== "log:thread-image") return;
    const tid = String(event.threadID);
    if (!locks.get(tid)) return;
    const lf = lockFile(tid);
    if (!fs.existsSync(lf)) return;
    try { await api.changeGroupImage(fs.createReadStream(lf), tid); } catch(_) {}
  }
};
