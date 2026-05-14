/**
 * DAVID V1 — /groupimg — تغيير وقفل صورة الغروب (مثل WHITE-V3)
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

function isAdmin(id) {
  const cfg = global.GoatBot?.config || {};
  const sid = String(id);
  const owners = [cfg.ownerID, ...(cfg.superAdminBot||[])].filter(Boolean).map(String);
  const admins = (cfg.adminBot||[]).map(String);
  return owners.includes(sid) || admins.includes(sid);
}

async function isGroupAdmin(api, uid, tid) {
  try {
    const info = await new Promise((res, rej) => api.getThreadInfo(tid, (e,d) => e ? rej(e) : res(d)));
    const admins = info?.adminIDs || [];
    return admins.some(a => String(a.id || a) === String(uid));
  } catch (_) { return false; }
}

const locks = new Map();

async function applyImage(api, tid) {
  const lf = lockFile(tid);
  if (!fs.existsSync(lf)) return;
  try { await api.changeGroupImage(fs.createReadStream(lf), tid); } catch (_) {}
}

module.exports = {
  config: {
    name: "groupimg",
    aliases: ["gcimg", "صورة", "img"],
    version: "3.0",
    author: "DJAMEL",
    countDown: 5,
    role: 2,
    category: "management",
    description: "تغيير وقفل صورة الغروب تلقائياً",
    guide: { en: "{pn} [رابط أو صورة] — تغيير وقفل\n{pn} off — فك القفل\n{pn} status — الحالة" }
  },

  onStart: async function({ api, event, args, message }) {
    const tid = String(event.threadID);
    const uid = event.senderID;

    const canUse = isAdmin(uid) || await isGroupAdmin(api, uid, tid);
    if (!canUse) return message.reply("⛔ هذا الأمر للأدمن فقط.");

    const sub = (args[0] || "").toLowerCase();

    if (sub === "off" || sub === "إيقاف") {
      locks.set(tid, false);
      const lf = lockFile(tid);
      if (fs.existsSync(lf)) { try { fs.removeSync(lf); } catch(_) {} }
      return message.reply("✅ تم فك قفل صورة الغروب.\n🔓 يمكن الآن تغيير الصورة بحرية.");
    }

    if (sub === "status" || sub === "حالة") {
      const locked = locks.get(tid) === true && fs.existsSync(lockFile(tid));
      return message.reply(locked
        ? "🔒 صورة الغروب مقفلة.\n↩️ استخدم /groupimg off لفك القفل."
        : "🔓 صورة الغروب غير مقفلة.");
    }

    let imageUrl = null;
    const attach = event.messageReply?.attachments?.[0] || event.attachments?.[0];
    if (attach?.type === "photo") {
      imageUrl = attach.url || attach.previewUrl || attach.thumbnailUrl;
    }
    if (!imageUrl) {
      for (const a of args) {
        if (a && (a.startsWith("http://") || a.startsWith("https://"))) { imageUrl = a; break; }
      }
    }

    if (!imageUrl) {
      return message.reply(
        "📸 كيفية الاستخدام:\n" +
        "• أرسل صورة مع الأمر /groupimg\n" +
        "• أو: /groupimg [رابط]\n" +
        "• أو رد على صورة بـ /groupimg\n\n" +
        "/groupimg off — فك القفل\n" +
        "/groupimg status — الحالة"
      );
    }

    message.react("⏳", event.messageID);
    try {
      const res = await axios.get(imageUrl, {
        responseType: "arraybuffer",
        timeout: 20000,
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      const lf = lockFile(tid);
      fs.writeFileSync(lf, Buffer.from(res.data));
      await api.changeGroupImage(fs.createReadStream(lf), tid);
      locks.set(tid, true);
      message.react("✅", event.messageID);
      message.reply(
        "✅ تم تغيير صورة الغروب وقفلها.\n" +
        "🔒 سيتم إعادة الصورة تلقائياً عند التغيير.\n" +
        "↩️ /groupimg off لفك القفل."
      );
    } catch (e) {
      message.react("❌", event.messageID);
      message.reply("❌ فشل تغيير الصورة: " + e.message);
    }
  },

  onEvent: async function({ api, event }) {
    if (event.logMessageType !== "log:thread-image") return;
    const tid = String(event.threadID);
    if (locks.get(tid) !== true) return;
    const lf = lockFile(tid);
    if (!fs.existsSync(lf)) return;
    setTimeout(() => applyImage(api, tid), 2000);
  }
};
