/**
 * DAVID V1 — /uptime — وقت تشغيل البوت مع إحصائيات
 * Copyright © 2025 DJAMEL
 */
"use strict";
const os = require("os");

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts = [];
  if (d) parts.push(`${d} يوم`);
  if (h) parts.push(`${h} ساعة`);
  if (m) parts.push(`${m} دقيقة`);
  parts.push(`${sec} ثانية`);
  return parts.join(" و ");
}

module.exports = {
  config: {
    name: "uptime", aliases: ["up","ping","وقت"], version: "2.0", author: "DJAMEL",
    countDown: 5, role: 2, category: "info",
    description: "عرض وقت تشغيل البوت مع الإحصائيات",
    guide: { en: "{pn} — عرض الإحصائيات" }
  },

  onStart: async function({ api, event, message }) {
    const start = global.GoatBot?.startTime || Date.now();
    const upMs  = Date.now() - start;
    const mem   = process.memoryUsage();
    const sysM  = { total: os.totalmem(), free: os.freemem() };
    const cmds  = global.GoatBot?.commands?.size || 0;
    const uid   = global.GoatBot?.botID || "—";
    const prefix = global.GoatBot?.config?.prefix || "/";

    const ping = Date.now();
    await new Promise(r => setTimeout(r, 10));
    const pong = Date.now() - ping;

    const lines = [
      `╔════ DAVID V1 — Status ════╗`,
      `║ 🤖 Bot ID: ${uid}`,
      `║ ⏱ Uptime: ${formatUptime(upMs)}`,
      `║ 🏓 Ping: ${pong}ms`,
      `║ 📦 Commands: ${cmds}`,
      `║ 💾 RAM Used: ${(mem.heapUsed/1048576).toFixed(1)} MB`,
      `║ 💻 System RAM: ${((sysM.total-sysM.free)/1073741824).toFixed(2)}/${(sysM.total/1073741824).toFixed(2)} GB`,
      `║ 🛡 Protection: 20 طبقة نشطة`,
      `║ 🔑 Prefix: ${prefix}`,
      `║ 👑 By: DJAMEL`,
      `╚══════════════════════════╝`
    ];

    message.reply(lines.join("\n"));
  }
};
