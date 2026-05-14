/**
 * DAVID V1 — Core Globals (GoatBot Pattern)
 * Copyright © 2025 DJAMEL
 */
"use strict";

const path = require("path");

function initGlobals(config) {
  global.GoatBot = {
    startTime:      Date.now(),
    config,
    commands:       new Map(),
    eventCommands:  new Map(),
    aliases:        new Map(),
    onChat:         [],
    onReply:        new Map(),
    onReaction:     new Map(),
    onEvent:        [],
    fcaApi:         null,
    botID:          null,
    angelIntervals: {},
    divelWatchers:  {},
    nmLocks:        new Map(),
    dmLocked:       false,
    allThreadData:  {},
    reLoginBot:     () => {},
    _replyTimeout:  30 * 60 * 1000,
  };

  global.db = { allThreadData: [], allUserData: [] };

  // utils globaux
  const fca = require("../../Djamel-fca");
  global.utils = {
    calcHumanTypingDelay: fca.calcTypingDelay,
    simulateTyping:       fca.simulateTyping,
    log:                  require("./logger"),
    sleep:   ms => new Promise(r => setTimeout(r, ms)),
    isNum:   v  => !isNaN(parseFloat(v)) && isFinite(v),
    getPrefix: () => global.GoatBot?.config?.prefix || "/",
    rand:    (a, b) => Math.floor(Math.random() * (b - a + 1)) + a,
  };

  // Clean expired onReply entries every 5 min
  setInterval(() => {
    const now = Date.now();
    const timeout = global.GoatBot?._replyTimeout || 1800000;
    for (const [k, v] of global.GoatBot.onReply) {
      if (v.ts && now - v.ts > timeout) global.GoatBot.onReply.delete(k);
    }
  }, 5 * 60 * 1000);

  // Aliases
  global.log           = global.utils.log;
  global.config        = config;
  global.ownerID       = config.ownerID || "";
  global.commandPrefix = config.prefix  || "/";
  global.commands      = global.GoatBot.commands;
  global.djamelbot     = { startTime: Date.now(), version: config.botVersion || "2.0.0", api: null };
}

module.exports = { initGlobals };
