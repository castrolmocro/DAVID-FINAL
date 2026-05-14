/**
 * DAVID V1 — /tik — تنزيل فيديو TikTok بدون علامة مائية
 * Copyright © 2025 DJAMEL
 */
"use strict";
const axios = require("axios");
const fs    = require("fs-extra");
const path  = require("path");
const os    = require("os");
const TMP   = path.join(os.tmpdir(), "david_tik");
fs.ensureDirSync(TMP);

const TIKWM = "https://www.tikwm.com/api/feed/search";
function isAdmin(id) { return (global.GoatBot?.config?.adminBot||[]).map(String).includes(String(id)); }
function fmtViews(n) {
  if (!n) return "0";
  if (n>=1e9) return (n/1e9).toFixed(1)+"B";
  if (n>=1e6) return (n/1e6).toFixed(1)+"M";
  if (n>=1e3) return (n/1e3).toFixed(1)+"K";
  return String(n);
}
function fmtDur(s) { const m=Math.floor(s/60); return `${m}:${String(s%60).padStart(2,"0")}`; }

module.exports = {
  config: {
    name: "tiktok", aliases: ["tik","tt","تيك"], version: "3.0", author: "DJAMEL",
    countDown: 10, role: 2, category: "media",
    description: "البحث في TikTok وتنزيل الفيديو بدون علامة مائية",
    guide: { en: "{pn} [كلمة بحث]\nأو أرسل رابط TikTok مباشرة" }
  },

  onStart: async function({ api, event, args, message }) {
    if (!isAdmin(event.senderID)) return message.reply("⛔ للأدمن فقط.");
    const input = args.join(" ").trim();
    if (!input) return message.reply("❗ اكتب كلمة بحث أو رابط TikTok.\nمثال: /tik gojo");

    message.react("🔍", event.messageID);
    const wait = await message.reply(`🔍 جاري البحث في TikTok عن "${input}"…`);

    try {
      // مسار 1: رابط مباشر → تنزيل مباشر
      if (input.includes("tiktok.com") || input.includes("vm.tiktok")) {
        api.unsendMessage(wait.messageID).catch(()=>{});
        return await this._downloadDirect(api, event, message, input);
      }

      // مسار 2: بحث
      const res = await axios.get(TIKWM, {
        params: { keywords: input, count: 6, cursor: 0, hd: 1 },
        timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" }
      });
      const videos = res.data?.data?.videos;
      if (!videos?.length) {
        api.unsendMessage(wait.messageID).catch(()=>{});
        message.react("❌", event.messageID);
        return message.reply(`❌ لم أجد نتائج لـ "${input}"`);
      }

      let body = `🎵 نتائج TikTok: "${input}"\n━━━━━━━━━━━━━━━━\n`;
      videos.slice(0,5).forEach((v,i) => {
        body += `${i+1}. ${(v.title||"بلا عنوان").slice(0,60)}\n`;
        body += `   ⏱ ${fmtDur(v.duration||0)} | 👁 ${fmtViews(v.play_count)}\n\n`;
      });
      body += `اكتب رقم الفيديو (1-${Math.min(videos.length,5)})`;

      api.unsendMessage(wait.messageID).catch(()=>{});
      const listMsg = await message.reply(body);

      global.GoatBot.onReply.set(`tik_${listMsg.messageID}`, {
        messageID: listMsg.messageID,
        author:    event.senderID,
        callback: async ({ api, event: replyEvent, message: replyMsg }) => {
          global.GoatBot.onReply.delete(`tik_${listMsg.messageID}`);
          const choice = parseInt(replyEvent.body?.trim()) - 1;
          if (isNaN(choice) || choice < 0 || choice >= videos.length)
            return replyMsg.reply("❌ رقم غير صالح.");

          const video = videos[choice];
          const dlWait = await replyMsg.reply(`⬇️ جاري التنزيل…`);
          await this._download(api, replyEvent, replyMsg, video, dlWait);
        }
      });
    } catch(e) {
      try { api.unsendMessage(wait.messageID); } catch(_) {}
      message.react("❌", event.messageID);
      message.reply("❌ خطأ: " + e.message);
    }
  },

  _download: async function(api, event, message, video, waitMsg) {
    const outPath = path.join(TMP, `tik_${Date.now()}.mp4`);
    try {
      const dlUrl = `https://www.tikwm.com/video/media/play/${video.video_id}.mp4`;
      const res   = await axios.get(dlUrl, { responseType: "arraybuffer", timeout: 30000 });
      fs.writeFileSync(outPath, Buffer.from(res.data));
      if (waitMsg) api.unsendMessage(waitMsg.messageID).catch(()=>{});

      await api.sendMessage({
        body: `🎵 ${(video.title||"").slice(0,100)}\n👁 ${fmtViews(video.play_count)} | ⏱ ${fmtDur(video.duration||0)}\n👑 DAVID V1`,
        attachment: fs.createReadStream(outPath)
      }, event.threadID);
      fs.removeSync(outPath);
    } catch(e) {
      if (waitMsg) api.unsendMessage(waitMsg.messageID).catch(()=>{});
      message.reply("❌ فشل التنزيل: " + e.message);
      if (fs.existsSync(outPath)) fs.removeSync(outPath);
    }
  },

  _downloadDirect: async function(api, event, message, url) {
    const dlWait = await message.reply("⬇️ جاري تنزيل الفيديو…");
    const outPath = path.join(TMP, `tik_${Date.now()}.mp4`);
    try {
      const apiRes = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, { timeout: 15000 });
      const data   = apiRes.data?.data;
      if (!data?.play) throw new Error("فشل الحصول على رابط التنزيل");
      const res = await axios.get(data.play, { responseType: "arraybuffer", timeout: 30000 });
      fs.writeFileSync(outPath, Buffer.from(res.data));
      api.unsendMessage(dlWait.messageID).catch(()=>{});
      await api.sendMessage({
        body: `🎵 ${(data.title||"").slice(0,100)}\n👑 DAVID V1`,
        attachment: fs.createReadStream(outPath)
      }, event.threadID);
      fs.removeSync(outPath);
    } catch(e) {
      api.unsendMessage(dlWait.messageID).catch(()=>{});
      message.reply("❌ فشل التنزيل: " + e.message);
      if (fs.existsSync(outPath)) fs.removeSync(outPath);
    }
  }
};
