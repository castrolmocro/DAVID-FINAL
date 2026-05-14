/**
 * DAVID V1 — /song — البحث وتنزيل الأغاني من YouTube
 * Copyright © 2025 DJAMEL
 */
"use strict";

// File polyfill (required by ytdl-core in older Node)
if (typeof globalThis.File === "undefined") {
  const Base = globalThis.Blob || class B { constructor(c,o){} };
  globalThis.File = class File extends Base {
    constructor(c, n, o = {}) { super(c, o); this._name = n; this._lm = o.lastModified ?? Date.now(); }
    get name() { return this._name; } get lastModified() { return this._lm; }
  };
}

const axios  = require("axios");
const fs     = require("fs-extra");
const path   = require("path");
const os     = require("os");
const ytsr   = require("yt-search");

const TMP = path.join(os.tmpdir(), "david_song");
fs.ensureDirSync(TMP);

function isAdmin(id) { return (global.GoatBot?.config?.adminBot||[]).map(String).includes(String(id)); }
function fmtDur(s)  { const m=Math.floor(s/60); return `${m}:${String(s%60).padStart(2,"0")}`; }
function fmtN(n) {
  if (!n) return "0";
  if (n >= 1e9) return (n/1e9).toFixed(1)+"B";
  if (n >= 1e6) return (n/1e6).toFixed(1)+"M";
  if (n >= 1e3) return (n/1e3).toFixed(1)+"K";
  return String(n);
}

async function downloadAudio(videoUrl, outPath) {
  try {
    const ytdl = require("ytdl-core");
    if (ytdl.validateURL(videoUrl)) {
      await new Promise((res, rej) => {
        const stream = ytdl(videoUrl, { quality: "highestaudio", filter: "audioonly" });
        const out    = fs.createWriteStream(outPath);
        stream.pipe(out);
        out.on("finish", res);
        out.on("error", rej);
        stream.on("error", rej);
      });
      return fs.existsSync(outPath) && fs.statSync(outPath).size > 1000;
    }
  } catch (_) {}
  return false;
}

module.exports = {
  config: {
    name: "song", aliases: ["music","أغنية","موسيقى"], version: "3.0", author: "DJAMEL",
    countDown: 10, role: 2, category: "media",
    description: "البحث عن الأغاني وتنزيلها من YouTube",
    guide: { en: "{pn} [اسم الأغنية]\nمثال: {pn} يا حبيبي" }
  },

  onStart: async function({ api, event, args, message }) {
    if (!isAdmin(event.senderID)) return message.reply("⛔ للأدمن فقط.");
    const query = args.join(" ").trim();
    if (!query) return message.reply("❗ اكتب اسم الأغنية.\nمثال: /song يا حبيبي");

    message.react("🔍", event.messageID);
    const wait = await message.reply(`🎵 جاري البحث عن "${query}"…`);

    try {
      const results = await ytsr(query);
      const videos  = (results.videos || []).slice(0, 5);
      if (!videos.length) {
        api.unsendMessage(wait.messageID).catch(()=>{});
        message.react("❌", event.messageID);
        return message.reply(`❌ لم أجد نتائج لـ "${query}"`);
      }

      let body = `🎵 نتائج "${query}"\n━━━━━━━━━━━━━━━━\n`;
      videos.forEach((v,i) => {
        body += `${i+1}. ${v.title}\n`;
        body += `   ⏱ ${v.timestamp||"?"} | 👁 ${fmtN(v.views)}\n\n`;
      });
      body += `اكتب رقم الأغنية (1-${videos.length})`;

      api.unsendMessage(wait.messageID).catch(()=>{});
      const listMsg = await message.reply(body);

      global.GoatBot.onReply.set(`song_${listMsg.messageID}`, {
        messageID: listMsg.messageID,
        author:    event.senderID,
        callback:  async ({ api, event: re, message: rm }) => {
          global.GoatBot.onReply.delete(`song_${listMsg.messageID}`);
          const choice = parseInt(re.body?.trim()) - 1;
          if (isNaN(choice) || choice < 0 || choice >= videos.length)
            return rm.reply("❌ رقم غير صالح.");

          const video   = videos[choice];
          const dlWait  = await rm.reply(`⬇️ جاري تنزيل: ${video.title}`);
          const outPath = path.join(TMP, `song_${Date.now()}.mp3`);

          try {
            const ok = await downloadAudio(video.url, outPath);
            api.unsendMessage(dlWait.messageID).catch(()=>{});
            if (ok) {
              await api.sendMessage({
                body: `🎵 ${video.title}\n⏱ ${video.timestamp||"?"} | 👑 DAVID V1`,
                attachment: fs.createReadStream(outPath)
              }, re.threadID);
              fs.removeSync(outPath);
            } else {
              rm.reply(`❌ فشل التنزيل المباشر.\n🔗 ${video.url}`);
            }
          } catch(e) {
            api.unsendMessage(dlWait.messageID).catch(()=>{});
            rm.reply(`❌ خطأ: ${e.message}\n🔗 ${video.url}`);
            if (fs.existsSync(outPath)) fs.removeSync(outPath);
          }
        }
      });
    } catch(e) {
      try { api.unsendMessage(wait.messageID); } catch(_) {}
      message.react("❌", event.messageID);
      message.reply("❌ خطأ في البحث: " + e.message);
    }
  }
};
