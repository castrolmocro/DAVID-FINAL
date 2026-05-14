/**
 * DAVID V1 — /help — قائمة الأوامر بتصميم جميل
 * Copyright © 2025 DJAMEL
 */
"use strict";

const COMMANDS_INFO = {
  angel:    { icon: "👼", desc: "رسائل تلقائية دورية للغروبات",        usage: "/angel [رسالة] [min-max ثانية] / off / status" },
  divel:    { icon: "🌀", desc: "رسائل دورية مع انتظار عشوائي",        usage: "/divel [رسالة] [min-max] / off / status" },
  nick:     { icon: "✍️", desc: "تغيير كنية جميع الأعضاء باستمرار",   usage: "/nick [اسم] / off / status / حدف" },
  nm:       { icon: "🔒", desc: "قفل اسم الغروب",                       usage: "/nm [اسم] / off / time [min] [max] / status" },
  chats:    { icon: "💬", desc: "إدارة المحادثات والغروبات",            usage: "/chats count / list / dm on|off / angel" },
  groupimg: { icon: "🖼️", desc: "تغيير وقفل صورة الغروب",              usage: "/groupimg [رابط أو صورة] / off / status" },
  song:     { icon: "🎵", desc: "البحث وتنزيل الأغاني من YouTube",     usage: "/song [اسم الأغنية]" },
  tiktok:   { icon: "🎬", desc: "تنزيل فيديو TikTok بدون علامة مائية",usage: "/tiktok [بحث أو رابط]" },
  uptime:   { icon: "⏱️", desc: "وقت تشغيل البوت مع الإحصائيات",      usage: "/uptime" },
  help:     { icon: "❓", desc: "عرض قائمة الأوامر",                    usage: "/help [اسم الأمر]" },
};

function buildHelpAll(prefix) {
  const lines = [
    "╔════════════════════════════════════╗",
    "║       🤖 DAVID V1 — قائمة الأوامر       ║",
    "║         By DJAMEL | دياميل         ║",
    "╠════════════════════════════════════╣",
    `║  Prefix: ${prefix}                       ║`,
    "╠════════════════════════════════════╣",
  ];

  const allCmds = global.GoatBot?.commands;
  const seen    = new Set();

  if (allCmds?.size) {
    for (const [, cmd] of allCmds) {
      const name = cmd.config?.name;
      if (!name || seen.has(name)) continue;
      seen.add(name);
      const info = COMMANDS_INFO[name] || {};
      const icon = info.icon || "•";
      const desc = (cmd.config?.description || info.desc || "").slice(0, 35);
      lines.push(`║ ${icon} ${prefix}${name.padEnd(10)} — ${desc}`);
    }
  } else {
    for (const [name, info] of Object.entries(COMMANDS_INFO)) {
      lines.push(`║ ${info.icon} ${prefix}${name.padEnd(10)} — ${info.desc}`);
    }
  }

  lines.push("╠════════════════════════════════════╣");
  lines.push(`║  📦 الإجمالي: ${seen.size || Object.keys(COMMANDS_INFO).length} أمر          ║`);
  lines.push(`║  🛡 الحماية: 20 طبقة نشطة          ║`);
  lines.push("╠════════════════════════════════════╣");
  lines.push("║  /help [اسم الأمر] للتفاصيل        ║");
  lines.push("╚════════════════════════════════════╝");
  return lines.join("\n");
}

function buildHelpOne(name, prefix) {
  const allCmds = global.GoatBot?.commands;
  const cmd     = allCmds?.get(name.toLowerCase());
  const info    = COMMANDS_INFO[name.toLowerCase()] || {};
  const icon    = info.icon || "•";

  const config  = cmd?.config || {};
  const desc    = config.description || config.longDescription || info.desc || "لا يوجد وصف";
  const usage   = config.guide?.en?.replace(/\{p[n]?\}/g, prefix) || info.usage || `${prefix}${name}`;
  const aliases = (config.aliases || []).filter(Boolean);
  const cat     = config.category || "admin";
  const role    = config.role === 3 ? "👑 Owner" : config.role === 2 ? "🔑 Admin" : "👤 User";

  const lines = [
    `╔══ ${icon} ${prefix}${name.toUpperCase()} ════════════════════╗`,
    `║ 📝 ${desc}`,
    `║ 📌 الاستخدام:`,
    ...usage.split("\n").map(l => `║    ${l}`),
    `║ 🏷 الفئة: ${cat}`,
    `║ 🔑 الصلاحية: ${role}`,
  ];
  if (aliases.length) lines.push(`║ 🔀 اختصارات: ${aliases.join(", ")}`);
  lines.push("╚════════════════════════════════════╝");
  return lines.join("\n");
}

module.exports = {
  config: {
    name: "help", aliases: ["h","مساعدة","أوامر"], version: "2.0", author: "DJAMEL",
    countDown: 3, role: 2, category: "info",
    description: "عرض قائمة الأوامر بتصميم جميل",
    guide: { en: "{pn} — عرض كل الأوامر\n{pn} [اسم الأمر] — تفاصيل أمر" }
  },

  onStart: async function({ args, message, prefix }) {
    if (args[0]) {
      const name = args[0].toLowerCase().replace(/^\//, "");
      message.reply(buildHelpOne(name, prefix));
    } else {
      message.reply(buildHelpAll(prefix));
    }
  }
};
